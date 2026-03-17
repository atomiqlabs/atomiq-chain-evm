/**
 * Node.js-only entrypoint for filesystem-backed EVM helpers.
 *
 * Import from `@atomiqlabs/chain-evm/node` when you need runtime features
 * that depend on Node's `fs` module.
 *
 * @packageDocumentation
 */
export { EVMChainEvents } from "../evm/events/EVMChainEvents";
export { EVMPersistentSigner } from "../evm/wallet/EVMPersistentSigner";
