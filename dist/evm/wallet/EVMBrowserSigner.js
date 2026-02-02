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
    async sendTransaction(transaction, onBeforePublish) {
        try {
            return await super.sendTransaction(transaction, onBeforePublish);
        }
        catch (e) {
            if (e?.message?.includes("ACTION_REJECTED") || e?.message?.includes("User rejected"))
                e.message = "User refused to sign the transaction";
            throw e;
        }
    }
}
exports.EVMBrowserSigner = EVMBrowserSigner;
