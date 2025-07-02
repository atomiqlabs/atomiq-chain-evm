import {BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer, ChainSwapType} from "@atomiqlabs/base";
import {JsonRpcApiProvider, JsonRpcProvider} from "ethers";
import {EVMChainInterface, EVMRetryPolicy} from "../../evm/chain/EVMChainInterface";
import {EVMFees} from "../../evm/chain/modules/EVMFees";
import {CitreaChainType} from "./CitreaChainType";
import {EVMBtcRelay} from "../../evm/btcrelay/EVMBtcRelay";
import {EVMSwapContract} from "../../evm/swaps/EVMSwapContract";
import {EVMSpvVaultContract} from "../../evm/spv_swap/EVMSpvVaultContract";
import {EVMChainEventsBrowser} from "../../evm/events/EVMChainEventsBrowser";
import {EVMSwapData} from "../../evm/swaps/EVMSwapData";
import {EVMSpvVaultData} from "../../evm/spv_swap/EVMSpvVaultData";
import {EVMSpvWithdrawalData} from "../../evm/spv_swap/EVMSpvWithdrawalData";

const CitreaChainIds = {
    MAINNET: null,
    TESTNET4: 5115
};

const CitreaContractAddresses = {
    MAINNET: {
        executionContract: "",
        swapContract: "",
        btcRelayContract: "",
        spvVaultContract: "",
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
    TESTNET4: {
        executionContract: "0x9e289512965A0842b342A6BB3F3c41F22a555Cfe",
        swapContract: "0xBbf7755b674dD107d59F0650D1A3fA9C60bf6Fe6",
        btcRelayContract: "0xaCeEF9bf23b41D4898516D2Fdcd7b4BDc22444D7",
        spvVaultContract: "0x9Bf990C6088F716279797a602b05941c40591533",
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

export type CitreaAssetsType = BaseTokenType<"CBTC">;
export const CitreaAssets: CitreaAssetsType = {
    CBTC: {
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        displayDecimals: 8
    }
} as const;

export type CitreaOptions = {
    rpcUrl: string | JsonRpcApiProvider,
    retryPolicy?: EVMRetryPolicy,
    chainType?: "MAINNET" | "TESTNET4",
    maxLogsBlockRange?: number,

    swapContract?: string,
    btcRelayContract?: string,
    spvVaultContract?: string,
    handlerContracts?: {
        refund?: {
            timelock?: string
        },
        claim?: {
            [type in ChainSwapType]?: string
        }
    }

    fees?: EVMFees
}

export function initializeCitrea(
    options: CitreaOptions,
    bitcoinRpc: BitcoinRpc<any>,
    network: BitcoinNetwork
): ChainData<CitreaChainType> {
    const defaultContractAddresses = CitreaContractAddresses[options.chainType];
    const chainId = CitreaChainIds[options.chainType];

    const provider = typeof(options.rpcUrl)==="string" ?
        new JsonRpcProvider(options.rpcUrl, {name: "Citrea", chainId}) :
        options.rpcUrl;

    const Fees = options.fees ?? new EVMFees(provider);

    const chainInterface = new EVMChainInterface("CITREA", chainId, provider, {
        safeBlockTag: "latest",
        maxLogsBlockRange: options.maxLogsBlockRange ?? 500
    }, options.retryPolicy, Fees);

    const btcRelay = new EVMBtcRelay(
        chainInterface, bitcoinRpc, network, options.btcRelayContract ?? defaultContractAddresses.btcRelayContract
    );

    const swapContract = new EVMSwapContract(
        chainInterface, btcRelay, options.swapContract, {
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
        chainInterface, btcRelay, bitcoinRpc, options.spvVaultContract ?? defaultContractAddresses.spvVaultContract
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
    chainType: null as CitreaChainType,
    initializer: initializeCitrea,
    tokens: CitreaAssets,
    options: null as CitreaOptions
} as const;
