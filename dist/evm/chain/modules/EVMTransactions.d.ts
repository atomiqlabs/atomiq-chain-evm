import { EVMModule } from "../EVMModule";
import { Transaction, TransactionRequest } from "ethers";
import { EVMSigner } from "../../wallet/EVMSigner";
/**
 * Unsigned EVM transaction type used by chain modules.
 *
 * @category Chain Interface
 */
export type EVMTx = TransactionRequest;
/**
 * Signed EVM transaction type as produced by ethers.
 *
 * @category Chain Interface
 */
export type SignedEVMTx = Transaction;
/**
 * Simplified call-trace structure returned by `debug_traceTransaction` with `callTracer`.
 *
 * @category Internal/Chain
 */
export type EVMTxTrace = {
    from: string;
    gas: string;
    gasused: string;
    to: string;
    input: string;
    output: string;
    error: string;
    revertReason: string;
    calls: EVMTxTrace[];
    type: "CREATE" | "CALL" | "STATICCALL";
};
/**
 * Transaction service for preparing, signing, broadcasting and confirming EVM transactions.
 *
 * @category Internal/Chain
 */
export declare class EVMTransactions extends EVMModule<any> {
    private readonly latestConfirmedNonces;
    private readonly latestPendingNonces;
    private readonly latestSignedNonces;
    readonly _cbksBeforeTxReplace: ((oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>)[];
    private readonly cbksBeforeTxSigned;
    private cbkSendTransaction?;
    readonly _knownTxSet: Set<string>;
    /**
     * Waits for transaction confirmation using HTTP polling
     *
     * @param tx EVM transaction to wait for confirmation for
     * @param abortSignal signal to abort waiting for tx confirmation
     * @private
     */
    private confirmTransaction;
    private applyAccessList;
    /**
     * Prepares EVM transactions, assigns nonces when needed, and optionally applies access lists
     * before signing.
     *
     * @param txs
     * @param signer
     * @param useAccessList Whether to use access lists for sending txns
     */
    prepareTransactions(txs: TransactionRequest[], signer?: EVMSigner, useAccessList?: boolean): Promise<void>;
    /**
     * Sends out a signed transaction to the RPC
     *
     * @param tx EVM tx to send
     * @param onBeforePublish a callback called before every transaction is published
     * @private
     */
    private sendSignedTransaction;
    /**
     * Prepares, signs, sends (in parallel or sequentially) & optionally waits for confirmation
     *  of a batch of EVM transactions
     *
     * @param signer
     * @param txs transactions to send
     * @param waitForConfirmation whether to wait for transaction confirmations (this also makes sure the transactions
     *  are re-sent at regular intervals)
     * @param abortSignal abort signal to abort waiting for transaction confirmations
     * @param parallel whether the send all the transaction at once in parallel or sequentially (such that transactions
     *  are executed in order)
     * @param onBeforePublish a callback called before every transaction is published, NOTE: callback is not called when using browser-based wallet!
     * @param useAccessLists
     */
    sendAndConfirm(signer: EVMSigner, txs: TransactionRequest[], waitForConfirmation?: boolean, abortSignal?: AbortSignal, parallel?: boolean, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>, useAccessLists?: boolean): Promise<string[]>;
    sendSignedAndConfirm(signedTxs: Transaction[], waitForConfirmation?: boolean, abortSignal?: AbortSignal, parallel?: boolean, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<string[]>;
    /**
     * Serializes the unsigned EVM transaction
     *
     * @param unsignedTx
     */
    serializeUnsignedTx(unsignedTx: TransactionRequest): Promise<string>;
    /**
     * Serializes the signed EVM transaction
     *
     * @param tx
     */
    serializeSignedTx(tx: Transaction): string;
    /**
     * Deserializes an unsigned EVM transaction
     *
     * @param unsignedTxData
     */
    deserializeUnsignedTx(unsignedTxData: string): TransactionRequest;
    /**
     * Deserializes signed EVM transaction
     *
     * @param signedTxData
     */
    deserializeSignedTx(signedTxData: string): Transaction;
    /**
     * Gets the status of a raw signed EVM transaction.
     *
     * @param tx
     */
    getTxStatus(tx: string): Promise<"pending" | "success" | "not_found" | "reverted">;
    /**
     * Gets the status of the EVM transaction with a specific txId
     *
     * @param txId
     */
    getTxIdStatus(txId: string): Promise<"pending" | "success" | "not_found" | "reverted">;
    onBeforeTxSigned(callback: (tx: TransactionRequest) => Promise<void>): void;
    offBeforeTxSigned(callback: (tx: TransactionRequest) => Promise<void>): boolean;
    onSendTransaction(callback: (tx: string) => Promise<string>): void;
    offSendTransaction(callback: (tx: string) => Promise<string>): boolean;
    onBeforeTxReplace(callback: (oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>): void;
    offBeforeTxReplace(callback: (oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>): boolean;
    traceTransaction(txId: string): Promise<EVMTxTrace>;
}
