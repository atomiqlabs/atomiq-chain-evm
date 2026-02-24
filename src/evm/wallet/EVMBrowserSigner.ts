import {Signer, TransactionRequest, TransactionResponse, verifyMessage} from "ethers";
import {EVMSigner} from "./EVMSigner";

/**
 * A static message, which should be signed by the EVM wallets to generate reproducible entropy. Works when
 *  wallets use signing with deterministic nonce, such that signature over the same message always yields the
 *  same signature (same entropy).
 *
 * @category Wallets
 */
export const EVM_REPRODUCIBLE_ENTROPY_MESSAGE =
"Signing this messages generates a reproducible secret to be used on %APPNAME%.\n\nPLEASE DOUBLE CHECK THAT YOU"+
" ARE ON THE %APPNAME% WEBSITE BEFORE SIGNING THE MESSAGE, SIGNING THIS MESSAGE ON ANY OTHER WEBSITE MIGHT LEAD TO"+
" LOSS OF FUNDS!";

/**
 * Browser-based EVM signer for external wallet integration
 * @category Wallets
 */
export class EVMBrowserSigner extends EVMSigner {

    private usesECDSADN?: boolean;

    getReproducibleEntropy?: (appName: string) => Promise<Buffer>;

    /**
     * @param account Signer account to request signatures and send transaction through
     * @param address Signer address
     * @param usesECDSADN Optional flag indicating whether the signer supports signing using ECDSA-DN (deterministic
     *  nonce) algorithm, this allows the wallet to produce reproducible entropy. Only pass `true` here if you are
     *  100% sure that the signer supports this!
     */
    constructor(account: Signer, address: string, usesECDSADN?: boolean) {
        super(account, address, false);
        this.usesECDSADN = usesECDSADN;
        this.signTransaction = undefined;
        if(this.usesECDSADN!==false) {
            this.getReproducibleEntropy = async (appName: string) => {
                if(this.usesECDSADN===false) throw new Error("This wallet doesn't support generating recoverable entropy!");

                const message = EVM_REPRODUCIBLE_ENTROPY_MESSAGE.replace(new RegExp("%APPNAME%", 'g'), appName);
                const signature = await account.signMessage(message);
                if(this.usesECDSADN!==true) {
                    const secondSignature = await account.signMessage(message);
                    if(signature!==secondSignature) {
                        this.usesECDSADN = false;
                        this.getReproducibleEntropy = undefined;
                        throw new Error("This wallet doesn't support generating recoverable entropy!");
                    }
                    this.usesECDSADN = true;
                }
                if(verifyMessage(message, signature)!==address) throw new Error("Invalid wallet signature provided!");
                return Buffer.from(signature.substring(2), "hex");
            }
        }
    }

    async sendTransaction(transaction: TransactionRequest, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<TransactionResponse> {
        try {
            return await super.sendTransaction(transaction, onBeforePublish);
        } catch (e: any) {
            if(e?.message?.includes("ACTION_REJECTED") || e?.message?.includes("User rejected"))
                e.message = "User refused to sign the transaction";
            throw e;
        }
    }

}