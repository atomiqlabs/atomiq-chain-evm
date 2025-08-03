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
    MAINNET: null,
    MUTINYNET: 3636
};
const BotanixContractAddresses = {
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
    MUTINYNET: {
        executionContract: "0xBbf7755b674dD107d59F0650D1A3fA9C60bf6Fe6",
        swapContract: "0xf61D1da542111216337FeEA5586022130D468842",
        btcRelayContract: "0x4F59D7e0D7E1Eb4957C9C0C2971B5EEa291A6068",
        btcRelayDeploymentHeight: 3426264,
        spvVaultContract: "0x1120e1Eb3049148AeBEe497331774BfE1f6c174D",
        spvVaultDeploymentHeight: 3425257,
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
exports.BotanixAssets = {
    BBTC: {
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        displayDecimals: 8
    }
};
function initializeBotanix(options, bitcoinRpc, network) {
    if (options.chainType == null) {
        switch (network) {
            case base_1.BitcoinNetwork.MAINNET:
                options.chainType = "MAINNET";
                break;
        }
    }
    const defaultContractAddresses = BotanixContractAddresses[options.chainType];
    const chainId = BotanixChainIds[options.chainType];
    const provider = typeof (options.rpcUrl) === "string" ?
        new ethers_1.JsonRpcProvider(options.rpcUrl, { name: "Botanix", chainId }) :
        options.rpcUrl;
    const Fees = options.fees ?? new EVMFees_1.EVMFees(provider, 2n * 1000000000n, 1000000n);
    const chainInterface = new EVMChainInterface_1.EVMChainInterface("BOTANIX", chainId, provider, {
        safeBlockTag: "latest",
        maxLogsBlockRange: options.maxLogsBlockRange ?? 500
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
exports.BotanixInitializer = {
    chainId: "BOTANIX",
    chainType: null,
    initializer: initializeBotanix,
    tokens: exports.BotanixAssets,
    options: null
};
