/// <reference types="node" />
/// <reference types="node" />
import { Signer, TransactionRequest, TransactionResponse } from "ethers";
import { EVMSigner } from "./EVMSigner";
/**
 * A static message, which should be signed by the EVM wallets to generate reproducible entropy. Works when
 *  wallets use signing with deterministic nonce, such that signature over the same message always yields the
 *  same signature (same entropy).
 *
 * @category Wallets
 */
export declare const EVM_REPRODUCIBLE_ENTROPY_MESSAGE = "Signing this messages generates a reproducible secret to be used on %APPNAME%.\n\nPLEASE DOUBLE CHECK THAT YOU\n    ARE ON THE %APPNAME% WEBSITE BEFORE SIGNING THE MESSAGE, SIGNING THIS MESSAGE ON ANY OTHER WEBSITE MIGHT LEAD TO\n    LOSS OF FUNDS!";
/**
 * Browser-based EVM signer for external wallet integration
 * @category Wallets
 */
export declare class EVMBrowserSigner extends EVMSigner {
    private usesECDSADN?;
    getReproducibleEntropy?: (appName: string) => Promise<Buffer>;
    /**
     * @param account Signer account to request signatures and send transaction through
     * @param address Signer address
     * @param usesECDSADN Optional flag indicating whether the signer supports signing using ECDSA-DN (deterministic
     *  nonce) algorithm, this allows the wallet to produce reproducible entropy. Only pass `true` here if you are
     *  100% sure that the signer supports this!
     */
    constructor(account: Signer, address: string, usesECDSADN?: boolean);
    sendTransaction(transaction: TransactionRequest, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<TransactionResponse>;
}
