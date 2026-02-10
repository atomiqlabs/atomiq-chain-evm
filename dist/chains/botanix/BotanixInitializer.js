"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotanixInitializer = exports.initializeBotanix = exports.BotanixAssets = void 0;
const base_1 = require("@atomiqlabs/base");
const ethers_1 = require("ethers");
const EVMChainInterface_1 = require("../../evm/chain/EVMChainInterface");
const EVMFees_1 = require("../../evm/chain/modules/EVMFees");
const EVMBtcRelay_1 = require("../../evm/btcrelay/EVMBtcRelay");
const EVMSwapContract_1 = require("../../evm/swaps/EVMSwapContract");
const EVMSpvVaultContract_1 = require("../../evm/spv_swap/EVMSpvVaultContract");
const EVMChainEventsBrowser_1 = require("../../evm/events/EVMChainEventsBrowser");
const EVMSwapData_1 = require("../../evm/swaps/EVMSwapData");
const EVMSpvVaultData_1 = require("../../evm/spv_swap/EVMSpvVaultData");
const EVMSpvWithdrawalData_1 = require("../../evm/spv_swap/EVMSpvWithdrawalData");
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
                [base_1.ChainSwapType.HTLC]: "0xfFA842529977a40A3fdb988cdDC9CB5c39bAcF26",
                [base_1.ChainSwapType.CHAIN_TXID]: "0xa2698D2fBE3f7c74cCca428a5fd968411644C641",
                [base_1.ChainSwapType.CHAIN]: "0x62a718348081F9CF9a8E3dF4B4EA6d6349991ad9",
                [base_1.ChainSwapType.CHAIN_NONCED]: "0xb0226bAC3BD30179fb66A43cEA212AbBC988e004"
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
                [base_1.ChainSwapType.HTLC]: "0xBe8C784b03F0c6d54aC35a4D41bd6CF2EDb6e012",
                [base_1.ChainSwapType.CHAIN_TXID]: "0x65faec5DC334bf2005eC2DFcf012da87a832f1F0",
                [base_1.ChainSwapType.CHAIN]: "0x4699450973c21d6Fe09e36A8A475EaE4D78a3137",
                [base_1.ChainSwapType.CHAIN_NONCED]: "0xfd0FbA128244f502678251b07dEa0fb4EcE959F3"
            }
        }
    }
};
const chainTypeMapping = {
    [base_1.BitcoinNetwork.MAINNET]: "MAINNET",
    [base_1.BitcoinNetwork.TESTNET]: "TESTNET",
};
/**
 * Default Botanix token assets configuration
 * @category Networks/Botanix
 */
exports.BotanixAssets = {
    BTC: {
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        displayDecimals: 8
    }
};
/**
 * Initialize Botanix chain integration
 * @category Networks/Botanix
 */
function initializeBotanix(options, bitcoinRpc, network) {
    options.chainType ?? (options.chainType = chainTypeMapping[network]);
    if (options.chainType == null)
        throw new Error("Please specify chainType in options!");
    const defaultContractAddresses = BotanixContractAddresses[options.chainType];
    const chainId = BotanixChainIds[options.chainType];
    const provider = typeof (options.rpcUrl) === "string" ?
        (options.rpcUrl.startsWith("ws")
            ? new ethers_1.WebSocketProvider(options.rpcUrl, { name: "Botanix", chainId })
            : new ethers_1.JsonRpcProvider(options.rpcUrl, { name: "Botanix", chainId })) :
        options.rpcUrl;
    const Fees = options.fees ?? new EVMFees_1.EVMFees(provider, 2n * 1000000000n, 100000n);
    const chainInterface = new EVMChainInterface_1.EVMChainInterface("BOTANIX", chainId, provider, {
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
    const btcRelay = new EVMBtcRelay_1.EVMBtcRelay(chainInterface, bitcoinRpc, network, options.btcRelayContract ?? defaultContractAddresses.btcRelayContract, options.btcRelayDeploymentHeight ?? defaultContractAddresses.btcRelayDeploymentHeight);
    const swapContract = new EVMSwapContract_1.EVMSwapContract(chainInterface, btcRelay, options.swapContract ?? defaultContractAddresses.swapContract, {
        refund: {
            ...defaultContractAddresses.handlerContracts.refund,
            ...options?.handlerContracts?.refund
        },
        claim: {
            ...defaultContractAddresses.handlerContracts.claim,
            ...options?.handlerContracts?.claim
        }
    }, options.swapContractDeploymentHeight ?? defaultContractAddresses.swapContractDeploymentHeight);
    const spvVaultContract = new EVMSpvVaultContract_1.EVMSpvVaultContract(chainInterface, btcRelay, bitcoinRpc, options.spvVaultContract ?? defaultContractAddresses.spvVaultContract, options.spvVaultDeploymentHeight ?? defaultContractAddresses.spvVaultDeploymentHeight);
    const chainEvents = new EVMChainEventsBrowser_1.EVMChainEventsBrowser(chainInterface, swapContract, spvVaultContract);
    return {
        chainId: "BOTANIX",
        btcRelay,
        chainInterface,
        swapContract,
        chainEvents,
        swapDataConstructor: EVMSwapData_1.EVMSwapData,
        spvVaultContract,
        spvVaultDataConstructor: EVMSpvVaultData_1.EVMSpvVaultData,
        spvVaultWithdrawalDataConstructor: EVMSpvWithdrawalData_1.EVMSpvWithdrawalData
    };
}
exports.initializeBotanix = initializeBotanix;
;
/**
 * Botanix chain initializer instance
 * @category Networks/Botanix
 */
exports.BotanixInitializer = {
    chainId: "BOTANIX",
    chainType: null,
    initializer: initializeBotanix,
    tokens: exports.BotanixAssets,
    options: null
};
