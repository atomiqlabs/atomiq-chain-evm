"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMContractBase = void 0;
const ethers_1 = require("ethers");
const EVMContractEvents_1 = require("./modules/EVMContractEvents");
/**
 * Base class providing program specific utilities
 */
class EVMContractBase {
    constructor(chainInterface, contractAddress, contractAbi, contractDeploymentHeight) {
        this.Chain = chainInterface;
        this.contract = new ethers_1.Contract(contractAddress, contractAbi, chainInterface.provider);
        this.Events = new EVMContractEvents_1.EVMContractEvents(chainInterface, this);
        this.contractAddress = contractAddress;
        this.contractDeploymentHeight = contractDeploymentHeight;
    }
    toTypedEvent(log) {
        let foundFragment = null;
        try {
            foundFragment = this.contract.interface.getEvent(log.topics[0]);
        }
        catch (error) { }
        if (!foundFragment)
            return null;
        try {
            return new ethers_1.EventLog(log, this.contract.interface, foundFragment);
        }
        catch (error) { }
        return null;
    }
    parseCalldata(calldata) {
        return this.contract.interface.parseTransaction({ data: calldata });
    }
}
exports.EVMContractBase = EVMContractBase;
