"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSpvVaultData = exports.EVMSpvWithdrawalData = exports.EVMSpvVaultContract = exports.EVMBtcRelay = exports.EVMBtcStoredHeader = exports.EVMBtcHeader = void 0;
/**
 * # @atomiqlabs/chain-evm
 *
 * `@atomiqlabs/chain-evm` is the EVM integration package for the Atomiq protocol.
 *
 * Within the Atomiq stack, this library provides the EVM-side building blocks used for Bitcoin-aware swaps and SPV-backed vault flows on supported EVM-compatible chains. It includes:
 *
 * - chain initializers for Atomiq-supported EVM networks
 * - the `EVMChainInterface` used to talk to chain RPCs
 * - BTC relay, escrow swap, and SPV vault contract wrappers
 * - browser and server-side EVM signer helpers
 * - event utilities for tracking swap and vault activity
 *
 * This package is intended for direct protocol integrations and for higher-level Atomiq SDK layers that need EVM chain support.
 *
 * ## Installation
 *
 * Install the package with its `ethers` peer dependency:
 *
 * ```bash
 * npm install @atomiqlabs/chain-evm ethers
 * ```
 *
 * ## Supported Chains
 *
 * The package currently exports chain initializers for:
 *
 * - Botanix via `BotanixInitializer`
 * - Citrea via `CitreaInitializer`
 * - Alpen via `AlpenInitializer`
 * - GOAT Network via `GoatInitializer`
 *
 * Canonical deployments currently defined in this package:
 *
 * | Chain | Canonical deployments included |
 * | --- | --- |
 * | Botanix | `MAINNET`, `TESTNET` |
 * | Citrea | `MAINNET`, `TESTNET4` |
 * | Alpen | `TESTNET`, `TESTNET4` |
 * | GOAT Network | `TESTNET`, `TESTNET4` |
 *
 * For Alpen and GOAT Network, `MAINNET` chain types exist in the API, but default mainnet contract addresses are not populated in this package yet. In those cases, pass explicit contract addresses if you want to use non-canonical deployments.
 *
 * ## SDK Example
 *
 * Initialize the atomiq SDK with Citrea network support:
 *
 * ```ts
 * import {CitreaInitializer, CitreaInitializerType} from "@atomiqlabs/chain-evm";
 * import {BitcoinNetwork, SwapperFactory, TypedSwapper} from "@atomiqlabs/sdk";
 *
 * //Define chains that you want to support here
 * const chains = [CitreaInitializer] as const;
 * type SupportedChains = typeof chains; //It's helpful that we also get the type of the chains array
 *
 * const Factory = new SwapperFactory<SupportedChains>(chains); //Create swapper factory
 *
 * const swapper: TypedSwapper<SupportedChains> = Factory.newSwapper({
 *   chains: {
 *     CITREA: {
 *       rpcUrl: citreaRpc, //You can also pass JsonApiProvider object here
 *     }
 *   },
 *   bitcoinNetwork: BitcoinNetwork.MAINNET //or BitcoinNetwork.TESTNET3, BitcoinNetwork.TESTNET4 - this also sets the deployment to use for EVM chains
 * });
 * ```
 *
 * @packageDocumentation
 */
__exportStar(require("./chains/EVMOptions"), exports);
__exportStar(require("./chains/citrea/CitreaInitializer"), exports);
__exportStar(require("./chains/citrea/CitreaChainType"), exports);
__exportStar(require("./chains/citrea/CitreaFees"), exports);
__exportStar(require("./chains/botanix/BotanixInitializer"), exports);
__exportStar(require("./chains/botanix/BotanixChainType"), exports);
__exportStar(require("./chains/alpen/AlpenInitializer"), exports);
__exportStar(require("./chains/alpen/AlpenChainType"), exports);
__exportStar(require("./chains/goat/GoatInitializer"), exports);
__exportStar(require("./chains/goat/GoatChainType"), exports);
var EVMBtcHeader_1 = require("./evm/btcrelay/headers/EVMBtcHeader");
Object.defineProperty(exports, "EVMBtcHeader", { enumerable: true, get: function () { return EVMBtcHeader_1.EVMBtcHeader; } });
var EVMBtcStoredHeader_1 = require("./evm/btcrelay/headers/EVMBtcStoredHeader");
Object.defineProperty(exports, "EVMBtcStoredHeader", { enumerable: true, get: function () { return EVMBtcStoredHeader_1.EVMBtcStoredHeader; } });
var EVMBtcRelay_1 = require("./evm/btcrelay/EVMBtcRelay");
Object.defineProperty(exports, "EVMBtcRelay", { enumerable: true, get: function () { return EVMBtcRelay_1.EVMBtcRelay; } });
__exportStar(require("./evm/chain/EVMChainInterface"), exports);
__exportStar(require("./evm/chain/modules/EVMFees"), exports);
__exportStar(require("./evm/events/EVMChainEventsBrowser"), exports);
__exportStar(require("./evm/providers/JsonRpcProviderWithRetries"), exports);
__exportStar(require("./evm/providers/WebSocketProviderWithRetries"), exports);
__exportStar(require("./evm/providers/ReconnectingWebSocketProvider"), exports);
var EVMSpvVaultContract_1 = require("./evm/spv_swap/EVMSpvVaultContract");
Object.defineProperty(exports, "EVMSpvVaultContract", { enumerable: true, get: function () { return EVMSpvVaultContract_1.EVMSpvVaultContract; } });
var EVMSpvWithdrawalData_1 = require("./evm/spv_swap/EVMSpvWithdrawalData");
Object.defineProperty(exports, "EVMSpvWithdrawalData", { enumerable: true, get: function () { return EVMSpvWithdrawalData_1.EVMSpvWithdrawalData; } });
var EVMSpvVaultData_1 = require("./evm/spv_swap/EVMSpvVaultData");
Object.defineProperty(exports, "EVMSpvVaultData", { enumerable: true, get: function () { return EVMSpvVaultData_1.EVMSpvVaultData; } });
__exportStar(require("./evm/swaps/EVMSwapContract"), exports);
__exportStar(require("./evm/swaps/EVMSwapData"), exports);
__exportStar(require("./evm/wallet/EVMSigner"), exports);
__exportStar(require("./evm/wallet/EVMBrowserSigner"), exports);
