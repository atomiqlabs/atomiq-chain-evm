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
import {GoatChainType} from "./GoatChainType";

const GoatChainIds = {
    MAINNET: 2345,
    TESTNET: 48816,
    TESTNET4: 48816
};

const GoatContractAddresses = {
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
        executionContract: "0xe8be24CF21341c9567664009a8a82C9Dc1eE90D6",
        swapContract: "0xe510D5781C6C849284Fb25Dc20b1684cEC445C8B",
        btcRelayContract: "0x3887B02217726bB36958Dd595e57293fB63D5082",
        btcRelayDeploymentHeight: 9368975,
        spvVaultContract: "0x71Bc44F3F7203fC1279107D924e418F02b0d4029",
        spvVaultDeploymentHeight: 9368977,
        handlerContracts: {
            refund: {
                timelock: "0xb0226bAC3BD30179fb66A43cEA212AbBC988e004"
            },
            claim: {
                [ChainSwapType.HTLC]: "0x9a027B5Bf43382Cc4A5134d9EFD389f61ece27B9",
                [ChainSwapType.CHAIN_TXID]: "0xfFA842529977a40A3fdb988cdDC9CB5c39bAcF26",
                [ChainSwapType.CHAIN]: "0xa2698D2fBE3f7c74cCca428a5fd968411644C641",
                [ChainSwapType.CHAIN_NONCED]: "0x62a718348081F9CF9a8E3dF4B4EA6d6349991ad9"
            }
        }
    },
    TESTNET4: {
        executionContract: "0x4f7d86C870F28ac30C8fa864Ee04264D7dD03847",
        swapContract: "0x3FbbA0eb82cf1247cbf92B3D51641226310F0Ca5",
        btcRelayContract: "0xEeD58871C24d24C49554aF8B65Dd86eD8ed778D3",
        btcRelayDeploymentHeight: 10240368,
        spvVaultContract: "0x8a80A68f8bA1732015A821b5260fEF8040a844b7",
        spvVaultDeploymentHeight: 10240370,
        handlerContracts: {
            refund: {
                timelock: "0x0Ff4792d4F792c5B3678f08c18e7cE1974880e48"
            },
            claim: {
                [ChainSwapType.HTLC]: "0x122962B30c46Ef188Dd598a76647c2DBbE1E914e",
                [ChainSwapType.CHAIN_TXID]: "0x4737C793a1f86a375BAad0D96134bEd64f246693",
                [ChainSwapType.CHAIN]: "0xa2b2d8CD8D1a9200Ac0970523FdfFcbD94aE54B6",
                [ChainSwapType.CHAIN_NONCED]: "0x3BfF76308e6DEaCaEfdF5a928d6a3082Ab55bf58"
            }
        }
    }
};

export type GoatAssetsType = BaseTokenType<"BTC" | "PBTC">;
export const GoatAssets: GoatAssetsType = {
    BTC: {
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        displayDecimals: 8
    },
    PBTC: {
        address: "0x42Dff13a9D6C33f89311C188F6eA780D00287F17",
        decimals: 18,
        displayDecimals: 8
    }
} as const;

export type GoatOptions = {
    rpcUrl: string | JsonRpcApiProvider,
    retryPolicy?: EVMRetryPolicy,
    chainType?: "MAINNET" | "TESTNET" | "TESTNET4",

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

export function initializeGoat(
    options: GoatOptions,
    bitcoinRpc: BitcoinRpc<any>,
    network: BitcoinNetwork
): ChainData<GoatChainType> {
    if(options.chainType==null) {
        switch (network) {
            case BitcoinNetwork.MAINNET:
                options.chainType = "MAINNET";
                break;
            case BitcoinNetwork.TESTNET:
                options.chainType = "TESTNET";
                break;
            case BitcoinNetwork.TESTNET4:
                options.chainType = "TESTNET4";
                break;
        }
    }

    const defaultContractAddresses = GoatContractAddresses[options.chainType];
    const chainId = GoatChainIds[options.chainType];

    const provider = typeof(options.rpcUrl)==="string" ?
        (
            options.rpcUrl.startsWith("ws")
                ? new WebSocketProvider(options.rpcUrl, {name: "GOAT Network", chainId})
                : new JsonRpcProvider(options.rpcUrl, {name: "GOAT Network", chainId})
        ):
        options.rpcUrl;

    const Fees = options.fees ?? new EVMFees(provider, 2n * 1_000_000_000n, 5_000_000n);

    const chainInterface = new EVMChainInterface("GOAT", chainId, provider, {
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
        chainId: "GOAT",
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

export type GoatInitializerType = ChainInitializer<GoatOptions, GoatChainType, GoatAssetsType>;
export const GoatInitializer: GoatInitializerType = {
    chainId: "GOAT",
    chainType: null as GoatChainType,
    initializer: initializeGoat,
    tokens: GoatAssets,
    options: null as GoatOptions
} as const;
