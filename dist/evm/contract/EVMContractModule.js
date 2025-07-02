"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMContractModule = void 0;
const EVMModule_1 = require("../chain/EVMModule");
class EVMContractModule extends EVMModule_1.EVMModule {
    constructor(chainInterface, contract) {
        super(chainInterface);
        this.contract = contract;
    }
}
exports.EVMContractModule = EVMContractModule;
