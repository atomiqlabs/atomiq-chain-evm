"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMContractBase = void 0;
const ethers_1 = require("ethers");
const EVMContractEvents_1 = require("./modules/EVMContractEvents");
/**
 * Base contract wrapper providing typed event and calldata parsing helpers.
 *
 * @category Internal/Contracts
 */
class EVMContractBase {
    constructor(chainInterface, contractAddress, contractAbi, contractDeploymentHeight) {
        this.Chain = chainInterface;
        this.contract = new ethers_1.Contract(contractAddress, contractAbi, chainInterface.provider);
        this._Events = new EVMContractEvents_1.EVMContractEvents(chainInterface, this);
        this._contractAddress = contractAddress;
        this._contractDeploymentHeight = contractDeploymentHeight;
    }
    /**
     * @internal
     */
    parseCalldata(calldata) {
        return this.contract.interface.parseTransaction({ data: calldata });
    }
}
exports.EVMContractBase = EVMContractBase;
