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
    maxRetries?: number;
    delay?: number;
    exponential?: boolean;
};
/**
 * Configuration options for EVM chain interface
 * @category Chain Interface
 */
export type EVMConfiguration = {
    safeBlockTag: EVMBlockTag;
    finalizedBlockTag: EVMBlockTag;
    maxLogsBlockRange: number;
    maxParallelLogRequests: number;
    maxParallelCalls: number;
    maxLogTopics: number;
    useAccessLists?: boolean;
    defaultAccessListAddresses?: string[];
    finalityCheckStrategy?: {
        type: "timer" | "blocks";
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
    readonly retryPolicy?: EVMRetryPolicy;
    readonly evmChainId: number;
    readonly config: EVMConfiguration;
    Fees: EVMFees;
    Tokens: EVMTokens;
    Transactions: EVMTransactions;
    Signatures: EVMSignatures;
    Events: EVMEvents;
    Blocks: EVMBlocks;
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
