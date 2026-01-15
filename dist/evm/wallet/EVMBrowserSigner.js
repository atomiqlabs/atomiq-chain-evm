"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMBrowserSigner = void 0;
const EVMSigner_1 = require("./EVMSigner");
/**
 * Browser-based EVM signer for external wallet integration
 * @category Wallets
 */
class EVMBrowserSigner extends EVMSigner_1.EVMSigner {
    constructor(account, address) {
        super(account, address, false);
        this.signTransaction = undefined;
    }
}
exports.EVMBrowserSigner = EVMBrowserSigner;
