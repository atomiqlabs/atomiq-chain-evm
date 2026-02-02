"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSigner = void 0;
const ethers_1 = require("ethers");
/**
 * EVM signer implementation wrapping an ethers Signer
 * @category Wallets
 */
class EVMSigner {
    constructor(account, address, isManagingNoncesInternally = false) {
        this.type = "AtomiqAbstractSigner";
        this.account = account;
        this.address = address;
        this.isManagingNoncesInternally = isManagingNoncesInternally;
    }
    /**
     * @inheritDoc
     */
    getAddress() {
        return (0, ethers_1.getAddress)(this.address);
    }
    async signTransaction(transaction) {
        return this.account.signTransaction(transaction);
    }
    async sendTransaction(transaction, onBeforePublish) {
        const txResponse = await this.account.sendTransaction(transaction);
        if (onBeforePublish != null)
            await onBeforePublish(txResponse.hash, ethers_1.Transaction.from({
                ...txResponse,
                chainId: transaction.chainId
            }).serialized);
        return txResponse;
    }
}
exports.EVMSigner = EVMSigner;
