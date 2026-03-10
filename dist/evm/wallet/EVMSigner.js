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
     * Returns a static message, which should be signed by the EVM wallets to generate reproducible entropy. Works when
     *  wallets use signing with deterministic nonce, such that signature over the same message always yields the
     *  same signature (same entropy).
     *
     * @param appName Application name to differentiate reproducible entropy generated across different apps
     */
    static getReproducibleEntropyMessage(appName) {
        return EVMSigner.EVM_REPRODUCIBLE_ENTROPY_MESSAGE.replace(new RegExp("%APPNAME%", 'g'), appName);
    }
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
/**
 * A static message, which should be signed by the EVM wallets to generate reproducible entropy. Works when
 *  wallets use signing with deterministic nonce, such that signature over the same message always yields the
 *  same signature (same entropy).
 */
EVMSigner.EVM_REPRODUCIBLE_ENTROPY_MESSAGE = "Signing this messages generates a reproducible secret to be used on %APPNAME%.\n\nPLEASE DOUBLE CHECK THAT YOU" +
    " ARE ON THE %APPNAME% WEBSITE BEFORE SIGNING THE MESSAGE, SIGNING THIS MESSAGE ON ANY OTHER WEBSITE MIGHT LEAD TO" +
    " LOSS OF FUNDS!";
