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
        executionContract: "0x71Bc44F3F7203fC1279107D924e418F02b0d4029",
        swapContract: "0x9a027B5Bf43382Cc4A5134d9EFD389f61ece27B9",
        swapContractDeploymentHeight: 2320403,
        btcRelayContract: "0xe8be24CF21341c9567664009a8a82C9Dc1eE90D6",
        btcRelayDeploymentHeight: 2320400,
        spvVaultContract: "0xe510D5781C6C849284Fb25Dc20b1684cEC445C8B",
        spvVaultDeploymentHeight: 2320402,
        handlerContracts: {
            refund: {
                timelock: "0x44aC0f0677C88e2c0B2FEc986b70E3b9A224f553"
            },
            claim: {
                [ChainSwapType.HTLC]: "0xfFA842529977a40A3fdb988cdDC9CB5c39bAcF26",
                [ChainSwapType.CHAIN_TXID]: "0xa2698D2fBE3f7c74cCca428a5fd968411644C641",
                [ChainSwapType.CHAIN]: "0x62a718348081F9CF9a8E3dF4B4EA6d6349991ad9",
                [ChainSwapType.CHAIN_NONCED]: "0xb0226bAC3BD30179fb66A43cEA212AbBC988e004"
            }
        }
    },
    TESTNET: {
        executionContract: "0xe510D5781C6C849284Fb25Dc20b1684cEC445C8B",
        swapContract: "0xfFA842529977a40A3fdb988cdDC9CB5c39bAcF26",
        swapContractDeploymentHeight: 4173454,
        btcRelayContract: "0xba7E78011909e3501027FBc226a04DCC837a555D",
        btcRelayDeploymentHeight: 3462466,
        spvVaultContract: "0x9a027B5Bf43382Cc4A5134d9EFD389f61ece27B9",
        spvVaultDeploymentHeight: 4173451,
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

const chainTypeMapping: {[key in BitcoinNetwork]?: "MAINNET" | "TESTNET"} = {
    [BitcoinNetwork.MAINNET]: "MAINNET",
    [BitcoinNetwork.TESTNET]: "TESTNET",
};

/**
 * Token assets available on Botanix
 * @category Networks/Botanix
 */
export type BotanixAssetsType = BaseTokenType<"BTC">;

/**
 * Default Botanix token assets configuration
 * @category Networks/Botanix
 */
export const BotanixAssets: BotanixAssetsType = {
    BTC: {
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        displayDecimals: 8
    }
} as const;

/**
 * Configuration options for initializing Botanix chain
 * @category Networks/Botanix
 */
export type BotanixOptions = {
    rpcUrl: string | JsonRpcApiProvider,
    retryPolicy?: EVMRetryPolicy,
    chainType?: "MAINNET" | "TESTNET",

    swapContract?: string,
    swapContractDeploymentHeight?: number,
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

    evmConfig?: Partial<Omit<EVMConfiguration, "safeBlockTag" | "finalizedBlockTag" | "finalityCheckStrategy">>
}

/**
 * Initialize Botanix chain integration
 * @category Networks/Botanix
 */
export function initializeBotanix(
    options: BotanixOptions,
    bitcoinRpc: BitcoinRpc<any>,
    network: BitcoinNetwork
): ChainData<BotanixChainType> {
    options.chainType ??= chainTypeMapping[network];
    if(options.chainType==null) throw new Error("Please specify chainType in options!");

    const defaultContractAddresses = BotanixContractAddresses[options.chainType];
    const chainId = BotanixChainIds[options.chainType];

    const provider = typeof(options.rpcUrl)==="string" ?
        (
            options.rpcUrl.startsWith("ws")
                ? new WebSocketProvider(options.rpcUrl, {name: "Botanix", chainId})
                : new JsonRpcProvider(options.rpcUrl, {name: "Botanix", chainId})
        ):
        options.rpcUrl;

    const Fees = options.fees ?? new EVMFees(provider, 2n * 1_000_000_000n, 100_000n);

    const chainInterface = new EVMChainInterface("BOTANIX", chainId, provider, {
        safeBlockTag: "finalized",
        finalizedBlockTag: "finalized",
        maxLogsBlockRange: options?.evmConfig?.maxLogsBlockRange ?? 950,
        maxLogTopics: options?.evmConfig?.maxLogTopics ?? 64,
        maxParallelLogRequests: options?.evmConfig?.maxParallelLogRequests ?? 5,
        maxParallelCalls: options?.evmConfig?.maxParallelCalls ?? 5,
        useAccessLists: options?.evmConfig?.useAccessLists,
        defaultAccessListAddresses: options?.evmConfig?.defaultAccessListAddresses,
        finalityCheckStrategy: {
            type: "timer",
            delayMs: 1000
        }
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
        },
        options.swapContractDeploymentHeight ?? defaultContractAddresses.swapContractDeploymentHeight
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

/**
 * Type definition for the Botanix chain initializer
 * @category Networks/Botanix
 */
export type BotanixInitializerType = ChainInitializer<BotanixOptions, BotanixChainType, BotanixAssetsType>;

/**
 * Botanix chain initializer instance
 * @category Networks/Botanix
 */
export const BotanixInitializer: BotanixInitializerType = {
    chainId: "BOTANIX",
    chainType: null as unknown as BotanixChainType,
    initializer: initializeBotanix,
    tokens: BotanixAssets,
    options: null as unknown  as BotanixOptions
} as const;
