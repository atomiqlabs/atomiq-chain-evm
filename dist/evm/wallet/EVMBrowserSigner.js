"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMBrowserSigner = void 0;
const ethers_1 = require("ethers");
const EVMSigner_1 = require("./EVMSigner");
/**
 * Browser-based EVM signer, intended for injected/external wallets. This ensures no explicit
 *  `signTransaction()` flow is required and transaction submission goes through `sendTransaction()`.
 *
 * @category Wallets
 */
class EVMBrowserSigner extends EVMSigner_1.EVMSigner {
    /**
     * @param account Signer account to request signatures and send transaction through
     * @param address Signer address
     * @param usesECDSADN Optional flag indicating whether the signer supports signing using ECDSA-DN (deterministic
     *  nonce) algorithm, this allows the wallet to produce reproducible entropy. Only pass `true` here if you are
     *  100% sure that the signer supports this!
     */
    constructor(account, address, usesECDSADN) {
        super(account, address, false);
        this.usesECDSADN = usesECDSADN;
        this.signTransaction = undefined;
        if (this.usesECDSADN !== false) {
            this.getReproducibleEntropy = async (appName) => {
                if (this.usesECDSADN === false)
                    throw new Error("This wallet doesn't support generating recoverable entropy!");
                const message = EVMSigner_1.EVMSigner.getReproducibleEntropyMessage(appName);
                const signature = await account.signMessage(message);
                if (this.usesECDSADN !== true) {
                    const secondSignature = await account.signMessage(message);
                    if (signature !== secondSignature) {
                        this.usesECDSADN = false;
                        this.getReproducibleEntropy = undefined;
                        throw new Error("This wallet doesn't support generating recoverable entropy!");
                    }
                    this.usesECDSADN = true;
                }
                if ((0, ethers_1.verifyMessage)(message, signature) !== address)
                    throw new Error("Invalid wallet signature provided!");
                return Buffer.from(signature.substring(2), "hex");
            };
        }
    }
    /**
     * Signs and sends the provided EVM transaction.
     * Maps common wallet rejection errors to a consistent user-facing message.
     *
     * @param transaction A transaction to sign and send
     * @param onBeforePublish Optional callback called after signing and before broadcast when available
     */
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
