import {BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer, ChainSwapType} from "@atomiqlabs/base";
import {JsonRpcApiProvider, JsonRpcProvider, WebSocketProvider} from "ethers";
import {EVMChainInterface, EVMConfiguration, EVMRetryPolicy} from "../../evm/chain/EVMChainInterface";
import {CitreaChainType} from "./CitreaChainType";
import {EVMChainEventsBrowser} from "../../evm/events/EVMChainEventsBrowser";
import {EVMSwapData} from "../../evm/swaps/EVMSwapData";
import {EVMSpvVaultData} from "../../evm/spv_swap/EVMSpvVaultData";
import {EVMSpvWithdrawalData} from "../../evm/spv_swap/EVMSpvWithdrawalData";
import {CitreaFees} from "./CitreaFees";
import {CitreaBtcRelay} from "./CitreaBtcRelay";
import {CitreaSwapContract} from "./CitreaSwapContract";
import {CitreaTokens} from "./CitreaTokens";
import {CitreaSpvVaultContract} from "./CitreaSpvVaultContract";

const CitreaChainIds = {
    MAINNET: 4114,
    TESTNET4: 5115
};

const CitreaContractAddresses = {
    MAINNET: {
        executionContract: "0x6a373b6Adad83964727bA0fa15E22Be05173fc12",
        swapContract: "0xc98Ef084d3911C8447DBbE4dDa18bC2c9bB0584e",
        btcRelayContract: "0x11ac854A68830d61af975063c91602f878C36fA6",
        btcRelayDeploymentHeight: 2452629,
        spvVaultContract: "0x5bb0C725939cB825d1322A99a3FeB570097628c3",
        spvVaultDeploymentHeight: 2452631,
        handlerContracts: {
            refund: {
                timelock: "0x2920EE496693A5027249a027A6FD3F643E743745"
            },
            claim: {
                [ChainSwapType.HTLC]: "0x8A44f1995a54fD976c904Cccf9EbaB49c3182eb3",
                [ChainSwapType.CHAIN_TXID]: "0x59A54378B6bA9C21ba66487C6A701D702baDEabE",
                [ChainSwapType.CHAIN]: "0x32EB4DbDdC31e19ba908fecc7cae03F0d04F01Fa",
                [ChainSwapType.CHAIN_NONCED]: "0xaB2D14745362B26a732dD8B7F95daAE3D2914bBF"
            }
        }
    },
    TESTNET4: {
        executionContract: "0x9e289512965A0842b342A6BB3F3c41F22a555Cfe",
        swapContract: "0xBbf7755b674dD107d59F0650D1A3fA9C60bf6Fe6",
        btcRelayContract: "0x00D122E9f9766cd81a38D2dd44f9AFfb94c67Af7",
        btcRelayDeploymentHeight: 12346223,
        spvVaultContract: "0x9Bf990C6088F716279797a602b05941c40591533",
        spvVaultDeploymentHeight: 12346223,
        handlerContracts: {
            refund: {
                timelock: "0x4699450973c21d6Fe09e36A8A475EaE4D78a3137"
            },
            claim: {
                [ChainSwapType.HTLC]: "0x1120e1Eb3049148AeBEe497331774BfE1f6c174D",
                [ChainSwapType.CHAIN_TXID]: "0xf61D1da542111216337FeEA5586022130D468842",
                [ChainSwapType.CHAIN]: "0xBe8C784b03F0c6d54aC35a4D41bd6CF2EDb6e012",
                [ChainSwapType.CHAIN_NONCED]: "0x65faec5DC334bf2005eC2DFcf012da87a832f1F0"
            }
        }
    }
};

const chainTypeMapping: {[key in BitcoinNetwork]?: "MAINNET" | "TESTNET4"} = {
    [BitcoinNetwork.MAINNET]: "MAINNET",
    [BitcoinNetwork.TESTNET4]: "TESTNET4",
};

export type CitreaAssetsType = BaseTokenType<"CBTC" | "WBTC" | "USDC">;
export const CitreaAssets: CitreaAssetsType = {
    CBTC: {
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        displayDecimals: 8
    },
    WBTC: {
        address: "0xDF240DC08B0FdaD1d93b74d5048871232f6BEA3d",
        decimals: 8,
        displayDecimals: 8
    },
    USDC: {
        address: "0x2C8abD2A528D19AFc33d2ebA507c0F405c131335",
        decimals: 6,
        displayDecimals: 6
    }
} as const;

export type CitreaOptions = {
    rpcUrl: string | JsonRpcApiProvider,
    retryPolicy?: EVMRetryPolicy,
    chainType?: "MAINNET" | "TESTNET4",

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

    fees?: CitreaFees,

    evmConfig?: Omit<EVMConfiguration, "safeBlockTag" | "finalizedBlockTag">
}

export function initializeCitrea(
    options: CitreaOptions,
    bitcoinRpc: BitcoinRpc<any>,
    network: BitcoinNetwork
): ChainData<CitreaChainType> {
    options.chainType ??= chainTypeMapping[network];
    if(options.chainType==null) throw new Error("Please specify chainType in options!");

    const defaultContractAddresses = CitreaContractAddresses[options.chainType];
    const chainId = CitreaChainIds[options.chainType];
    if(chainId==null) throw new Error("Invalid chainId due to wrong chainType specified, check the passed chainType!");

    const provider = typeof(options.rpcUrl)==="string" ?
        (
            options.rpcUrl.startsWith("ws")
                ? new WebSocketProvider(options.rpcUrl, {name: "Citrea", chainId})
                : new JsonRpcProvider(options.rpcUrl, {name: "Citrea", chainId})
        ):
        options.rpcUrl;

    const Fees = options.fees ?? new CitreaFees(provider, 2n * 1_000_000_000n, 100_000n);

    const chainInterface = new EVMChainInterface("CITREA", chainId, provider, {
        safeBlockTag: "latest",
        finalizedBlockTag: "safe",
        maxLogsBlockRange: options?.evmConfig?.maxLogsBlockRange ?? 950,
        maxLogTopics: options?.evmConfig?.maxLogTopics ?? 64,
        maxParallelLogRequests: options?.evmConfig?.maxParallelLogRequests ?? 5,
        maxParallelCalls: options?.evmConfig?.maxParallelCalls ?? 5,
        useAccessLists: options?.evmConfig?.useAccessLists,
        defaultAccessListAddresses: options?.evmConfig?.defaultAccessListAddresses
    }, options.retryPolicy, Fees);
    chainInterface.Tokens = new CitreaTokens(chainInterface); //Override with custom token module allowing l1 state diff based fee calculation

    const btcRelay = new CitreaBtcRelay(
        chainInterface, bitcoinRpc, network, options.btcRelayContract ?? defaultContractAddresses.btcRelayContract,
        options.btcRelayDeploymentHeight ?? defaultContractAddresses.btcRelayDeploymentHeight
    );

    const swapContract = new CitreaSwapContract(
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

    const spvVaultContract = new CitreaSpvVaultContract(
        chainInterface, btcRelay, bitcoinRpc, options.spvVaultContract ?? defaultContractAddresses.spvVaultContract,
        options.spvVaultDeploymentHeight ?? defaultContractAddresses.spvVaultDeploymentHeight
    )

    const chainEvents = new EVMChainEventsBrowser(chainInterface, swapContract, spvVaultContract);

    return {
        chainId: "CITREA",
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

export type CitreaInitializerType = ChainInitializer<CitreaOptions, CitreaChainType, CitreaAssetsType>;
export const CitreaInitializer: CitreaInitializerType = {
    chainId: "CITREA",
    chainType: null as unknown as CitreaChainType,
    initializer: initializeCitrea,
    tokens: CitreaAssets,
    options: null as unknown as CitreaOptions
} as const;
