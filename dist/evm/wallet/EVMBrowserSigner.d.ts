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
export declare const EVM_REPRODUCIBLE_ENTROPY_MESSAGE: string;
/**
 * Browser-based EVM signer, intended for injected/external wallets. This ensures no explicit
 *  `signTransaction()` flow is required and transaction submission goes through `sendTransaction()`.
 *
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
    /**
     * Signs and sends the provided EVM transaction.
     * Maps common wallet rejection errors to a consistent user-facing message.
     *
     * @param transaction A transaction to sign and send
     * @param onBeforePublish Optional callback called after signing and before broadcast when available
     */
    sendTransaction(transaction: TransactionRequest, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<TransactionResponse>;
}
