"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMContractModule = void 0;
const EVMModule_1 = require("../chain/EVMModule");
/**
 * Base module class for EVM components tied to a specific contract wrapper.
 *
 * @category Internal/Contracts
 */
class EVMContractModule extends EVMModule_1.EVMModule {
    constructor(chainInterface, contract) {
        super(chainInterface);
        this.contract = contract;
    }
}
exports.EVMContractModule = EVMContractModule;
