"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMPersistentSigner = exports.EVMChainEvents = void 0;
/**
 * Node.js-only entrypoint for filesystem-backed EVM helpers.
 *
 * Import from `@atomiqlabs/chain-evm/node` when you need runtime features
 * that depend on Node's `fs` module.
 *
 * @packageDocumentation
 */
var EVMChainEvents_1 = require("../evm/events/EVMChainEvents");
Object.defineProperty(exports, "EVMChainEvents", { enumerable: true, get: function () { return EVMChainEvents_1.EVMChainEvents; } });
var EVMPersistentSigner_1 = require("../evm/wallet/EVMPersistentSigner");
Object.defineProperty(exports, "EVMPersistentSigner", { enumerable: true, get: function () { return EVMPersistentSigner_1.EVMPersistentSigner; } });
