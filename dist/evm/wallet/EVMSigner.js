"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSigner = void 0;
class EVMSigner {
    constructor(account, address) {
        this.account = account;
        this.address = address;
    }
    getNonce() {
        return Promise.resolve(null);
    }
    getAddress() {
        return this.address;
    }
}
exports.EVMSigner = EVMSigner;
