import { EVMModule } from "../EVMModule";
import { Transaction, TransactionRequest } from "ethers";
import { EVMSigner } from "../../wallet/EVMSigner";
export type EVMTx = TransactionRequest;
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
export declare class EVMTransactions extends EVMModule<any> {
    private readonly latestConfirmedNonces;
    private readonly latestPendingNonces;
    private readonly latestSignedNonces;
    readonly _cbksBeforeTxReplace: ((oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>)[];
    private readonly cbksBeforeTxSigned;
    private cbkSendTransaction;
    readonly _knownTxSet: Set<string>;
    /**
     * Waits for transaction confirmation using HTTP polling
     *
     * @param tx EVM transaction to wait for confirmation for
     * @param abortSignal signal to abort waiting for tx confirmation
     * @private
     */
    private confirmTransaction;
    /**
     * Prepares starknet transactions, checks if the account is deployed, assigns nonces if needed & calls beforeTxSigned callback
     *
     * @param signer
     * @param txs
     * @private
     */
    private prepareTransactions;
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
     */
    sendAndConfirm(signer: EVMSigner, txs: TransactionRequest[], waitForConfirmation?: boolean, abortSignal?: AbortSignal, parallel?: boolean, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<string[]>;
    /**
     * Serializes the signed EVM transaction
     *
     * @param tx
     */
    serializeTx(tx: Transaction): Promise<string>;
    /**
     * Deserializes signed EVM transaction
     *
     * @param txData
     */
    deserializeTx(txData: string): Promise<Transaction>;
    /**
     * Gets the status of the raw starknet transaction
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
