import { ChainInterface, TransactionConfirmationOptions } from "@atomiqlabs/base";
import { LoggerType } from "../../utils/Utils";
import { JsonRpcApiProvider, Signer, Transaction, TransactionRequest } from "ethers";
import { EVMBlocks, EVMBlockTag } from "./modules/EVMBlocks";
import { EVMEvents } from "./modules/EVMEvents";
import { EVMFees } from "./modules/EVMFees";
import { EVMTokens } from "./modules/EVMTokens";
import { EVMTransactions, EVMTx, SignedEVMTx } from "./modules/EVMTransactions";
import { EVMSignatures } from "./modules/EVMSignatures";
import { EVMSigner } from "../wallet/EVMSigner";
/**
 * Retry policy configuration for EVM RPC calls
 * @category Chain Interface
 */
export type EVMRetryPolicy = {
    /**
     * Maximum retries to be attempted
     */
    maxRetries?: number;
    /**
     * Default delay between retries
     */
    delay?: number;
    /**
     * Whether the delays should scale exponentially, i.e. 1 second, 2 seconds, 4 seconds, 8 seconds
     */
    exponential?: boolean;
};
/**
 * Configuration options for EVM chain interface
 * @category Chain Interface
 */
export type EVMConfiguration = {
    /**
     * EVM Block tag to be considered safe for financial application, i.e. sending assets on different blockchains
     */
    safeBlockTag: EVMBlockTag;
    /**
     * EVM Block tag to be considered finalized, i.e. the state definitely cannot revert after the blocks gets
     *  this level of finality
     */
    finalizedBlockTag: EVMBlockTag;
    /**
     * Maximum range of blocks to query when querying `ethereum_getLogs` RPC endpoint.
     */
    maxLogsBlockRange: number;
    /**
     * Maximum number of `ethereum_getLogs` RPC calls to be executed in parallel
     */
    maxParallelLogRequests: number;
    /**
     * Maximum number of parallel contract calls to execute in batch functions
     */
    maxParallelCalls: number;
    /**
     * Maximum number of topics specified in the `ethereum_getLogs` RPC call
     */
    maxLogTopics: number;
    /**
     * Whether to use EIP-2930 access lists for transactions, if set to `true` the transaction is simulated before
     *  sending and the access list is populated for the transaction
     */
    useAccessLists?: boolean;
    /**
     * Default EIP-2930 addresses to add when simulating the transaction initially
     */
    defaultAccessListAddresses?: string[];
    /**
     * Strategy for checking finality of transactions or events
     */
    finalityCheckStrategy?: {
        /**
         * Type of the finality checking strategy:
         * - `"timer"` - periodically checks for the finality status, set the interval period `delayMs`
         * - `"blocks"` - check for the finality when new block is created
         */
        type: "timer" | "blocks";
        /**
         * Interval in milliseconds to use for the `"timer"` type of finality checking strategy
         */
        delayMs?: number;
    };
};
/**
 * Main chain interface for interacting with EVM-compatible blockchains
 * @category Chain Interface
 */
export declare class EVMChainInterface<ChainId extends string = string> implements ChainInterface<EVMTx, SignedEVMTx, EVMSigner, ChainId, Signer> {
    readonly chainId: ChainId;
    readonly provider: JsonRpcApiProvider;
    readonly evmChainId: number;
    /**
     * @internal
     */
    readonly _retryPolicy?: EVMRetryPolicy;
    /**
     * @internal
     */
    readonly _config: EVMConfiguration;
    Fees: EVMFees;
    Tokens: EVMTokens;
    Transactions: EVMTransactions;
    Signatures: EVMSignatures;
    Events: EVMEvents;
    Blocks: EVMBlocks;
    /**
     * @internal
     */
    protected logger: LoggerType;
    constructor(chainId: ChainId, evmChainId: number, provider: JsonRpcApiProvider, config: EVMConfiguration, retryPolicy?: EVMRetryPolicy, evmFeeEstimator?: EVMFees);
    /**
     * @inheritDoc
     */
    getBalance(signer: string, tokenAddress: string): Promise<bigint>;
    /**
     * @inheritDoc
     */
    getNativeCurrencyAddress(): string;
    /**
     * @inheritDoc
     */
    isValidToken(tokenIdentifier: string): boolean;
    /**
     * @inheritDoc
     */
    isValidAddress(address: string): boolean;
    /**
     * @inheritDoc
     */
    normalizeAddress(address: string): string;
    /**
     * @inheritDoc
     */
    offBeforeTxReplace(callback: (oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>): boolean;
    /**
     * @inheritDoc
     */
    onBeforeTxReplace(callback: (oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>): void;
    /**
     * @inheritDoc
     */
    onBeforeTxSigned(callback: (tx: TransactionRequest) => Promise<void>): void;
    /**
     * @inheritDoc
     */
    offBeforeTxSigned(callback: (tx: TransactionRequest) => Promise<void>): boolean;
    /**
     * @inheritDoc
     */
    randomAddress(): string;
    /**
     * @inheritDoc
     */
    randomSigner(): EVMSigner;
    /**
     * @inheritDoc
     */
    sendAndConfirm(signer: EVMSigner, txs: TransactionRequest[], waitForConfirmation?: boolean, abortSignal?: AbortSignal, parallel?: boolean, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>, useAccessLists?: boolean): Promise<string[]>;
    /**
     * @inheritDoc
     */
    sendSignedAndConfirm(signedTxs: Transaction[], waitForConfirmation?: boolean, abortSignal?: AbortSignal, parallel?: boolean, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<string[]>;
    /**
     * @inheritDoc
     */
    serializeTx(tx: TransactionRequest): Promise<string>;
    /**
     * @inheritDoc
     */
    deserializeTx(txData: string): Promise<TransactionRequest>;
    /**
     * @inheritDoc
     */
    serializeSignedTx(tx: Transaction): Promise<string>;
    /**
     * @inheritDoc
     */
    deserializeSignedTx(txData: string): Promise<Transaction>;
    /**
     * @inheritDoc
     */
    getTxIdStatus(txId: string): Promise<"not_found" | "pending" | "success" | "reverted">;
    /**
     * @inheritDoc
     */
    getTxStatus(tx: string): Promise<"not_found" | "pending" | "success" | "reverted">;
    /**
     * @inheritDoc
     */
    getFinalizedBlock(): Promise<{
        height: number;
        blockHash: string;
    }>;
    /**
     * @inheritDoc
     */
    txsTransfer(signer: string, token: string, amount: bigint, dstAddress: string, feeRate?: string): Promise<TransactionRequest[]>;
    /**
     * @inheritDoc
     */
    transfer(signer: EVMSigner, token: string, amount: bigint, dstAddress: string, txOptions?: TransactionConfirmationOptions): Promise<string>;
    /**
     * @inheritDoc
     */
    wrapSigner(signer: Signer): Promise<EVMSigner>;
}
