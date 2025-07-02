"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSwapModule = void 0;
const EVMContractModule_1 = require("../contract/EVMContractModule");
class EVMSwapModule extends EVMContractModule_1.EVMContractModule {
    constructor(chainInterface, contract) {
        super(chainInterface, contract);
        this.swapContract = contract.contract;
    }
}
exports.EVMSwapModule = EVMSwapModule;
