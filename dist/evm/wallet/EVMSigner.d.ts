import { AbstractSigner } from "@atomiqlabs/base";
import { Signer, TransactionRequest, TransactionResponse } from "ethers";
/**
 * EVM signer implementation wrapping an ethers {@link Signer}, for browser-based wallet use
 *  {@link EVMBrowserSigner}.
 *
 * @category Wallets
 */
export declare class EVMSigner implements AbstractSigner {
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
