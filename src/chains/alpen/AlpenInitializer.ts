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
import {AlpenChainType} from "./AlpenChainType";

const AlpenChainIds = {
    MAINNET: -1,
    TESTNET: 2892
};

const AlpenContractAddresses = {
    MAINNET: {
        executionContract: "",
        swapContract: "",
        btcRelayContract: "",
        btcRelayDeploymentHeight: 0,
        spvVaultContract: "",
        spvVaultDeploymentHeight: 0,
        handlerContracts: {
            refund: {
                timelock: ""
            },
            claim: {
                [ChainSwapType.HTLC]: "",
                [ChainSwapType.CHAIN_TXID]: "",
                [ChainSwapType.CHAIN]: "",
                [ChainSwapType.CHAIN_NONCED]: ""
            }
        }
    },
    TESTNET: {
        executionContract: "0xc98Ef084d3911C8447DBbE4dDa18bC2c9bB0584e",
        swapContract: "0x59A54378B6bA9C21ba66487C6A701D702baDEabE",
        btcRelayContract: "0x5bb0C725939cB825d1322A99a3FeB570097628c3",
        btcRelayDeploymentHeight: 1424534,
        spvVaultContract: "0x8A44f1995a54fD976c904Cccf9EbaB49c3182eb3",
        spvVaultDeploymentHeight: 1424536,
        handlerContracts: {
            refund: {
                timelock: "0xe8be24CF21341c9567664009a8a82C9Dc1eE90D6"
            },
            claim: {
                [ChainSwapType.HTLC]: "0x32EB4DbDdC31e19ba908fecc7cae03F0d04F01Fa",
                [ChainSwapType.CHAIN_TXID]: "0xaB2D14745362B26a732dD8B7F95daAE3D2914bBF",
                [ChainSwapType.CHAIN]: "0x2920EE496693A5027249a027A6FD3F643E743745",
                [ChainSwapType.CHAIN_NONCED]: "0x3887B02217726bB36958Dd595e57293fB63D5082"
            }
        }
    }
};

export type AlpenAssetsType = BaseTokenType<"BTC">;
export const AlpenAssets: AlpenAssetsType = {
    BTC: {
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        displayDecimals: 8
    }
} as const;

export type AlpenOptions = {
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

    evmConfig?: Omit<EVMConfiguration, "safeBlockTag" | "finalizedBlockTag">
}

export function initializeAlpen(
    options: AlpenOptions,
    bitcoinRpc: BitcoinRpc<any>,
    network: BitcoinNetwork
): ChainData<AlpenChainType> {
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

    const defaultContractAddresses = AlpenContractAddresses[options.chainType];
    const chainId = AlpenChainIds[options.chainType];

    const provider = typeof(options.rpcUrl)==="string" ?
        (
            options.rpcUrl.startsWith("ws")
                ? new WebSocketProvider(options.rpcUrl, {name: "Botanix", chainId})
                : new JsonRpcProvider(options.rpcUrl, {name: "Botanix", chainId})
        ):
        options.rpcUrl;

    const Fees = options.fees ?? new EVMFees(provider, 2n * 1_000_000_000n, 100_000n);

    const chainInterface = new EVMChainInterface("ALPEN", chainId, provider, {
        safeBlockTag: "latest",
        finalizedBlockTag: "latest",
        maxLogsBlockRange: options?.evmConfig?.maxLogsBlockRange ?? 950,
        maxLogTopics: options?.evmConfig?.maxLogTopics ?? 64,
        maxParallelLogRequests: options?.evmConfig?.maxParallelLogRequests ?? 5,
        maxParallelCalls: options?.evmConfig?.maxParallelCalls ?? 5,
        useAccessLists: options?.evmConfig?.useAccessLists,
        defaultAccessListAddresses: options?.evmConfig?.defaultAccessListAddresses
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
        chainId: "ALPEN",
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

export type AlpenInitializerType = ChainInitializer<AlpenOptions, AlpenChainType, AlpenAssetsType>;
export const AlpenInitializer: AlpenInitializerType = {
    chainId: "ALPEN",
    chainType: null as AlpenChainType,
    initializer: initializeAlpen,
    tokens: AlpenAssets,
    options: null as AlpenOptions
} as const;
