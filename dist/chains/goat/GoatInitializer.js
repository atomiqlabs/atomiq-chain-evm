"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoatInitializer = exports.initializeGoat = exports.GoatAssets = void 0;
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
const GoatChainIds = {
    MAINNET: 2345,
    TESTNET: 48816
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
                [base_1.ChainSwapType.HTLC]: "",
                [base_1.ChainSwapType.CHAIN_TXID]: "",
                [base_1.ChainSwapType.CHAIN]: "",
                [base_1.ChainSwapType.CHAIN_NONCED]: ""
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
                [base_1.ChainSwapType.HTLC]: "0x9a027B5Bf43382Cc4A5134d9EFD389f61ece27B9",
                [base_1.ChainSwapType.CHAIN_TXID]: "0xfFA842529977a40A3fdb988cdDC9CB5c39bAcF26",
                [base_1.ChainSwapType.CHAIN]: "0xa2698D2fBE3f7c74cCca428a5fd968411644C641",
                [base_1.ChainSwapType.CHAIN_NONCED]: "0x62a718348081F9CF9a8E3dF4B4EA6d6349991ad9"
            }
        }
    }
};
exports.GoatAssets = {
    BTC: {
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        displayDecimals: 8
    }
};
function initializeGoat(options, bitcoinRpc, network) {
    if (options.chainType == null) {
        switch (network) {
            case base_1.BitcoinNetwork.MAINNET:
                options.chainType = "MAINNET";
                break;
            case base_1.BitcoinNetwork.TESTNET:
                options.chainType = "TESTNET";
                break;
        }
    }
    const defaultContractAddresses = GoatContractAddresses[options.chainType];
    const chainId = GoatChainIds[options.chainType];
    const provider = typeof (options.rpcUrl) === "string" ?
        (options.rpcUrl.startsWith("ws")
            ? new ethers_1.WebSocketProvider(options.rpcUrl, { name: "GOAT Network", chainId })
            : new ethers_1.JsonRpcProvider(options.rpcUrl, { name: "GOAT Network", chainId })) :
        options.rpcUrl;
    const Fees = options.fees ?? new EVMFees_1.EVMFees(provider, 2n * 1000000000n, 5000000n);
    const chainInterface = new EVMChainInterface_1.EVMChainInterface("GOAT", chainId, provider, {
        safeBlockTag: "latest",
        finalizedBlockTag: "latest",
        maxLogsBlockRange: options?.evmConfig?.maxLogsBlockRange ?? 950,
        maxLogTopics: options?.evmConfig?.maxLogTopics ?? 64,
        maxParallelLogRequests: options?.evmConfig?.maxParallelLogRequests ?? 5,
        maxParallelCalls: options?.evmConfig?.maxParallelCalls ?? 5,
        useAccessLists: options?.evmConfig?.useAccessLists,
        defaultAccessListAddresses: options?.evmConfig?.defaultAccessListAddresses
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
    });
    const spvVaultContract = new EVMSpvVaultContract_1.EVMSpvVaultContract(chainInterface, btcRelay, bitcoinRpc, options.spvVaultContract ?? defaultContractAddresses.spvVaultContract, options.spvVaultDeploymentHeight ?? defaultContractAddresses.spvVaultDeploymentHeight);
    const chainEvents = new EVMChainEventsBrowser_1.EVMChainEventsBrowser(chainInterface, swapContract, spvVaultContract);
    return {
        chainId: "GOAT",
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
exports.initializeGoat = initializeGoat;
;
exports.GoatInitializer = {
    chainId: "GOAT",
    chainType: null,
    initializer: initializeGoat,
    tokens: exports.GoatAssets,
    options: null
};
