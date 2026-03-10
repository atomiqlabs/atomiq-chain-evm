import { AbstractSigner } from "@atomiqlabs/base";
import { Signer, TransactionRequest, TransactionResponse } from "ethers";
/**
 * EVM signer implementation wrapping an ethers {@link Signer}, for browser-based wallet use
 *  {@link EVMBrowserSigner}.
 *
 * @category Wallets
 */
export declare class EVMSigner implements AbstractSigner {
    /**
     * A static message, which should be signed by the EVM wallets to generate reproducible entropy. Works when
     *  wallets use signing with deterministic nonce, such that signature over the same message always yields the
     *  same signature (same entropy).
     */
    private static readonly EVM_REPRODUCIBLE_ENTROPY_MESSAGE;
    /**
     * Returns a static message, which should be signed by the EVM wallets to generate reproducible entropy. Works when
     *  wallets use signing with deterministic nonce, such that signature over the same message always yields the
     *  same signature (same entropy).
     *
     * @param appName Application name to differentiate reproducible entropy generated across different apps
     */
    static getReproducibleEntropyMessage(appName: string): string;
    type: "AtomiqAbstractSigner";
    account: Signer;
    readonly address: string;
    readonly isManagingNoncesInternally: boolean;
    /**
     * Constructs a signer wrapping an ethers {@link Signer}.
     *
     * @param account
     * @param address
     * @param isManagingNoncesInternally
     */
    constructor(account: Signer, address: string, isManagingNoncesInternally?: boolean);
    /**
     * @inheritDoc
     */
    getAddress(): string;
    /**
     * @inheritDoc
     */
    signTransaction?(transaction: TransactionRequest): Promise<string>;
    /**
     * @inheritDoc
     */
    sendTransaction(transaction: TransactionRequest, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<TransactionResponse>;
}
