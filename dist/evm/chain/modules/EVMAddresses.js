"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMAddresses = void 0;
const EVMModule_1 = require("../EVMModule");
const ethers_1 = require("ethers");
/**
 * @category Chain
 */
class EVMAddresses extends EVMModule_1.EVMModule {
    ///////////////////
    //// Address utils
    /**
     * Checks whether an address is a valid EVM address
     *
     * @param value
     */
    static isValidAddress(value) {
        if (value.length !== 42)
            return false;
        try {
            (0, ethers_1.isAddress)(value);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    static randomAddress() {
        const wallet = ethers_1.Wallet.createRandom();
        return wallet.address;
    }
}
exports.EVMAddresses = EVMAddresses;
