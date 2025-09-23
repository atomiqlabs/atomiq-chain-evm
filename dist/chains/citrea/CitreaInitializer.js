"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitreaInitializer = exports.initializeCitrea = exports.CitreaAssets = void 0;
const base_1 = require("@atomiqlabs/base");
const ethers_1 = require("ethers");
const EVMChainInterface_1 = require("../../evm/chain/EVMChainInterface");
const EVMChainEventsBrowser_1 = require("../../evm/events/EVMChainEventsBrowser");
const EVMSwapData_1 = require("../../evm/swaps/EVMSwapData");
const EVMSpvVaultData_1 = require("../../evm/spv_swap/EVMSpvVaultData");
const EVMSpvWithdrawalData_1 = require("../../evm/spv_swap/EVMSpvWithdrawalData");
const CitreaFees_1 = require("./CitreaFees");
const CitreaBtcRelay_1 = require("./CitreaBtcRelay");
const CitreaSwapContract_1 = require("./CitreaSwapContract");
const CitreaTokens_1 = require("./CitreaTokens");
const CitreaSpvVaultContract_1 = require("./CitreaSpvVaultContract");
const CitreaChainIds = {
    MAINNET: null,
    TESTNET4: 5115
};
const CitreaContractAddresses = {
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
                [base_1.ChainSwapType.HTLC]: "0x1120e1Eb3049148AeBEe497331774BfE1f6c174D",
                [base_1.ChainSwapType.CHAIN_TXID]: "0xf61D1da542111216337FeEA5586022130D468842",
                [base_1.ChainSwapType.CHAIN]: "0xBe8C784b03F0c6d54aC35a4D41bd6CF2EDb6e012",
                [base_1.ChainSwapType.CHAIN_NONCED]: "0x65faec5DC334bf2005eC2DFcf012da87a832f1F0"
            }
        }
    }
};
exports.CitreaAssets = {
    CBTC: {
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        displayDecimals: 8
    },
    USDC: {
        address: "0x2C8abD2A528D19AFc33d2ebA507c0F405c131335",
        decimals: 6,
        displayDecimals: 6
    }
};
function initializeCitrea(options, bitcoinRpc, network) {
    if (options.chainType == null) {
        switch (network) {
            case base_1.BitcoinNetwork.TESTNET4:
                options.chainType = "TESTNET4";
                break;
            case base_1.BitcoinNetwork.MAINNET:
                options.chainType = "MAINNET";
                break;
        }
    }
    const defaultContractAddresses = CitreaContractAddresses[options.chainType];
    const chainId = CitreaChainIds[options.chainType];
    const provider = typeof (options.rpcUrl) === "string" ?
        (options.rpcUrl.startsWith("ws")
            ? new ethers_1.WebSocketProvider(options.rpcUrl, { name: "Citrea", chainId })
            : new ethers_1.JsonRpcProvider(options.rpcUrl, { name: "Citrea", chainId })) :
        options.rpcUrl;
    const Fees = options.fees ?? new CitreaFees_1.CitreaFees(provider, 2n * 1000000000n, 1000000n);
    const chainInterface = new EVMChainInterface_1.EVMChainInterface("CITREA", chainId, provider, {
        safeBlockTag: "latest",
        finalizedBlockTag: "safe",
        maxLogsBlockRange: options?.evmConfig?.maxLogsBlockRange ?? 950,
        maxLogTopics: options?.evmConfig?.maxLogTopics ?? 64,
        maxParallelLogRequests: options?.evmConfig?.maxParallelLogRequests ?? 5,
        maxParallelCalls: options?.evmConfig?.maxParallelCalls ?? 5
    }, options.retryPolicy, Fees);
    chainInterface.Tokens = new CitreaTokens_1.CitreaTokens(chainInterface); //Override with custom token module allowing l1 state diff based fee calculation
    const btcRelay = new CitreaBtcRelay_1.CitreaBtcRelay(chainInterface, bitcoinRpc, network, options.btcRelayContract ?? defaultContractAddresses.btcRelayContract, options.btcRelayDeploymentHeight ?? defaultContractAddresses.btcRelayDeploymentHeight);
    const swapContract = new CitreaSwapContract_1.CitreaSwapContract(chainInterface, btcRelay, options.swapContract ?? defaultContractAddresses.swapContract, {
        refund: {
            ...defaultContractAddresses.handlerContracts.refund,
            ...options?.handlerContracts?.refund
        },
        claim: {
            ...defaultContractAddresses.handlerContracts.claim,
            ...options?.handlerContracts?.claim
        }
    });
    const spvVaultContract = new CitreaSpvVaultContract_1.CitreaSpvVaultContract(chainInterface, btcRelay, bitcoinRpc, options.spvVaultContract ?? defaultContractAddresses.spvVaultContract, options.spvVaultDeploymentHeight ?? defaultContractAddresses.spvVaultDeploymentHeight);
    const chainEvents = new EVMChainEventsBrowser_1.EVMChainEventsBrowser(chainInterface, swapContract, spvVaultContract);
    return {
        chainId: "CITREA",
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
exports.initializeCitrea = initializeCitrea;
;
exports.CitreaInitializer = {
    chainId: "CITREA",
    chainType: null,
    initializer: initializeCitrea,
    tokens: exports.CitreaAssets,
    options: null
};
