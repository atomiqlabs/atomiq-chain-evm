import {BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer, ChainSwapType} from "@atomiqlabs/base";
import {JsonRpcApiProvider, JsonRpcProvider, WebSocketProvider} from "ethers";
import {EVMChainInterface, EVMConfiguration, EVMRetryPolicy} from "../../evm/chain/EVMChainInterface";
import {EVMFees} from "../../evm/chain/modules/EVMFees";
import {EVMBtcRelay} from "../../evm/btcrelay/EVMBtcRelay";
import {EVMSwapContract} from "../../evm/swaps/EVMSwapContract";
import {EVMSpvVaultContract} from "../../evm/spv_swap/EVMSpvVaultContract";
import {EVMChainEventsBrowser} from "../../evm/events/EVMChainEventsBrowser";
import {EVMSwapData} from "../../evm/swaps/EVMSwapData";
import {EVMSpvVaultData} from "../../evm/spv_swap/EVMSpvVaultData";
import {EVMSpvWithdrawalData} from "../../evm/spv_swap/EVMSpvWithdrawalData";
import {BotanixChainType} from "./BotanixChainType";

const BotanixChainIds = {
    MAINNET: 3637,
    TESTNET: 3636
};

const BotanixContractAddresses = {
    MAINNET: {
        executionContract: "0x5bb0C725939cB825d1322A99a3FeB570097628c3",
        swapContract: "0x8A44f1995a54fD976c904Cccf9EbaB49c3182eb3",
        btcRelayContract: "0x6a373b6Adad83964727bA0fa15E22Be05173fc12",
        btcRelayDeploymentHeight: 1791247,
        spvVaultContract: "0xc98Ef084d3911C8447DBbE4dDa18bC2c9bB0584e",
        spvVaultDeploymentHeight: 1791249,
        handlerContracts: {
            refund: {
                timelock: "0x3887B02217726bB36958Dd595e57293fB63D5082"
            },
            claim: {
                [ChainSwapType.HTLC]: "0x59A54378B6bA9C21ba66487C6A701D702baDEabE",
                [ChainSwapType.CHAIN_TXID]: "0x32EB4DbDdC31e19ba908fecc7cae03F0d04F01Fa",
                [ChainSwapType.CHAIN]: "0xaB2D14745362B26a732dD8B7F95daAE3D2914bBF",
                [ChainSwapType.CHAIN_NONCED]: "0x2920EE496693A5027249a027A6FD3F643E743745"
            }
        }
    },
    TESTNET: {
        executionContract: "0xBbf7755b674dD107d59F0650D1A3fA9C60bf6Fe6",
        swapContract: "0xf61D1da542111216337FeEA5586022130D468842",
        btcRelayContract: "0xba7E78011909e3501027FBc226a04DCC837a555D",
        btcRelayDeploymentHeight: 3462466,
        spvVaultContract: "0x1120e1Eb3049148AeBEe497331774BfE1f6c174D",
        spvVaultDeploymentHeight: 3425257,
        handlerContracts: {
            refund: {
                timelock: "0xEf227Caf24681FcEDa5fC26777B81964D404e239"
            },
            claim: {
                [ChainSwapType.HTLC]: "0xBe8C784b03F0c6d54aC35a4D41bd6CF2EDb6e012",
                [ChainSwapType.CHAIN_TXID]: "0x65faec5DC334bf2005eC2DFcf012da87a832f1F0",
                [ChainSwapType.CHAIN]: "0x4699450973c21d6Fe09e36A8A475EaE4D78a3137",
                [ChainSwapType.CHAIN_NONCED]: "0xfd0FbA128244f502678251b07dEa0fb4EcE959F3"
            }
        }
    }
};

export type BotanixAssetsType = BaseTokenType<"BBTC">;
export const BotanixAssets: BotanixAssetsType = {
    BBTC: {
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        displayDecimals: 8
    }
} as const;

export type BotanixOptions = {
    rpcUrl: string | JsonRpcApiProvider,
    retryPolicy?: EVMRetryPolicy,
    chainType?: "MAINNET" | "TESTNET",

    swapContract?: string,
    btcRelayContract?: string,
    btcRelayDeploymentHeight?: number,
    spvVaultContract?: string,
    spvVaultDeploymentHeight?: number,
    handlerContracts?: {
        refund?: {
            timelock?: string
        },
        claim?: {
            [type in ChainSwapType]?: string
        }
    }

    fees?: EVMFees,

    evmConfig?: Omit<EVMConfiguration, "safeBlockTag">
}

export function initializeBotanix(
    options: BotanixOptions,
    bitcoinRpc: BitcoinRpc<any>,
    network: BitcoinNetwork
): ChainData<BotanixChainType> {
    if(options.chainType==null) {
        switch (network) {
            case BitcoinNetwork.MAINNET:
                options.chainType = "MAINNET";
                break;
            case BitcoinNetwork.TESTNET:
                options.chainType = "TESTNET";
                break;
        }
    }

    const defaultContractAddresses = BotanixContractAddresses[options.chainType];
    const chainId = BotanixChainIds[options.chainType];

    const provider = typeof(options.rpcUrl)==="string" ?
        (
            options.rpcUrl.startsWith("ws")
                ? new WebSocketProvider(options.rpcUrl, {name: "Botanix", chainId})
                : new JsonRpcProvider(options.rpcUrl, {name: "Botanix", chainId})
        ):
        options.rpcUrl;

    const Fees = options.fees ?? new EVMFees(provider, 2n * 1_000_000_000n, 1_000_000n);

    const chainInterface = new EVMChainInterface("BOTANIX", chainId, provider, {
        safeBlockTag: "finalized",
        maxLogsBlockRange: options?.evmConfig?.maxLogsBlockRange ?? 950,
        maxLogTopics: options?.evmConfig?.maxLogTopics ?? 64,
        maxParallelLogRequests: options?.evmConfig?.maxParallelLogRequests ?? 5,
        maxParallelCalls: options?.evmConfig?.maxParallelCalls ?? 5
    }, options.retryPolicy, Fees);

    const btcRelay = new EVMBtcRelay(
        chainInterface, bitcoinRpc, network, options.btcRelayContract ?? defaultContractAddresses.btcRelayContract,
        options.btcRelayDeploymentHeight ?? defaultContractAddresses.btcRelayDeploymentHeight
    );

    const swapContract = new EVMSwapContract(
        chainInterface, btcRelay, options.swapContract ?? defaultContractAddresses.swapContract, {
            refund: {
                ...defaultContractAddresses.handlerContracts.refund,
                ...options?.handlerContracts?.refund
            },
            claim: {
                ...defaultContractAddresses.handlerContracts.claim,
                ...options?.handlerContracts?.claim
            }
        }
    );

    const spvVaultContract = new EVMSpvVaultContract(
        chainInterface, btcRelay, bitcoinRpc, options.spvVaultContract ?? defaultContractAddresses.spvVaultContract,
        options.spvVaultDeploymentHeight ?? defaultContractAddresses.spvVaultDeploymentHeight
    )

    const chainEvents = new EVMChainEventsBrowser(chainInterface, swapContract, spvVaultContract);

    return {
        chainId: "BOTANIX",
        btcRelay,
        chainInterface,
        swapContract,
        chainEvents,
        swapDataConstructor: EVMSwapData,
        spvVaultContract,
        spvVaultDataConstructor: EVMSpvVaultData,
        spvVaultWithdrawalDataConstructor: EVMSpvWithdrawalData
    }
};

export type BotanixInitializerType = ChainInitializer<BotanixOptions, BotanixChainType, BotanixAssetsType>;
export const BotanixInitializer: BotanixInitializerType = {
    chainId: "BOTANIX",
    chainType: null as BotanixChainType,
    initializer: initializeBotanix,
    tokens: BotanixAssets,
    options: null as BotanixOptions
} as const;
