"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSigner = void 0;
class EVMSigner {
    constructor(account, address, isBrowserWallet = false) {
        this.account = account;
        this.address = address;
        this.isBrowserWallet = isBrowserWallet;
    }
    getNonce() {
        return Promise.resolve(null);
    }
    getAddress() {
        return this.address;
    }
}
exports.EVMSigner = EVMSigner;
