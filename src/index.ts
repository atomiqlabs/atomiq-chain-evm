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
export * from "./chains/EVMOptions";

export * from "./chains/citrea/CitreaInitializer";
export * from "./chains/citrea/CitreaChainType";
export * from "./chains/citrea/CitreaFees";

export * from "./chains/botanix/BotanixInitializer";
export * from "./chains/botanix/BotanixChainType";

export * from "./chains/alpen/AlpenInitializer";
export * from "./chains/alpen/AlpenChainType";

export * from "./chains/goat/GoatInitializer";
export * from "./chains/goat/GoatChainType";

export {EVMBtcHeader} from "./evm/btcrelay/headers/EVMBtcHeader";
export {EVMBtcStoredHeader} from "./evm/btcrelay/headers/EVMBtcStoredHeader";
export {EVMBtcRelay} from "./evm/btcrelay/EVMBtcRelay";

export * from "./evm/chain/EVMChainInterface";
export * from "./evm/chain/modules/EVMFees";

export * from "./evm/events/EVMChainEventsBrowser";

export * from "./evm/providers/JsonRpcProviderWithRetries";
export * from "./evm/providers/WebSocketProviderWithRetries";
export * from "./evm/providers/ReconnectingWebSocketProvider";

export {EVMSpvVaultContract} from "./evm/spv_swap/EVMSpvVaultContract";
export {EVMSpvWithdrawalData} from "./evm/spv_swap/EVMSpvWithdrawalData";
export {EVMSpvVaultData} from "./evm/spv_swap/EVMSpvVaultData";

export * from "./evm/swaps/EVMSwapContract";
export * from "./evm/swaps/EVMSwapData";

export * from "./evm/wallet/EVMSigner";
export * from "./evm/wallet/EVMBrowserSigner";
