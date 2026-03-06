"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSigner = void 0;
const ethers_1 = require("ethers");
/**
 * EVM signer implementation wrapping an ethers {@link Signer}, for browser-based wallet use
 *  {@link EVMBrowserSigner}.
 *
 * @category Wallets
 */
class EVMSigner {
    /**
     * Constructs a signer wrapping an ethers {@link Signer}.
     *
     * @param account
     * @param address
     * @param isManagingNoncesInternally
     */
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
    /**
     * @inheritDoc
     */
    async signTransaction(transaction) {
        return this.account.signTransaction(transaction);
    }
    /**
     * @inheritDoc
     */
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
