"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlpenInitializer = exports.initializeAlpen = exports.AlpenAssets = void 0;
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
                [base_1.ChainSwapType.HTLC]: "",
                [base_1.ChainSwapType.CHAIN_TXID]: "",
                [base_1.ChainSwapType.CHAIN]: "",
                [base_1.ChainSwapType.CHAIN_NONCED]: ""
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
                [base_1.ChainSwapType.HTLC]: "0x32EB4DbDdC31e19ba908fecc7cae03F0d04F01Fa",
                [base_1.ChainSwapType.CHAIN_TXID]: "0xaB2D14745362B26a732dD8B7F95daAE3D2914bBF",
                [base_1.ChainSwapType.CHAIN]: "0x2920EE496693A5027249a027A6FD3F643E743745",
                [base_1.ChainSwapType.CHAIN_NONCED]: "0x3887B02217726bB36958Dd595e57293fB63D5082"
            }
        }
    }
};
exports.AlpenAssets = {
    BTC: {
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        displayDecimals: 8
    }
};
function initializeAlpen(options, bitcoinRpc, network) {
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
    const defaultContractAddresses = AlpenContractAddresses[options.chainType];
    const chainId = AlpenChainIds[options.chainType];
    const provider = typeof (options.rpcUrl) === "string" ?
        (options.rpcUrl.startsWith("ws")
            ? new ethers_1.WebSocketProvider(options.rpcUrl, { name: "Botanix", chainId })
            : new ethers_1.JsonRpcProvider(options.rpcUrl, { name: "Botanix", chainId })) :
        options.rpcUrl;
    const Fees = options.fees ?? new EVMFees_1.EVMFees(provider, 2n * 1000000000n, 100000n);
    const chainInterface = new EVMChainInterface_1.EVMChainInterface("ALPEN", chainId, provider, {
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
        chainId: "ALPEN",
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
exports.initializeAlpen = initializeAlpen;
;
exports.AlpenInitializer = {
    chainId: "ALPEN",
    chainType: null,
    initializer: initializeAlpen,
    tokens: exports.AlpenAssets,
    options: null
};
