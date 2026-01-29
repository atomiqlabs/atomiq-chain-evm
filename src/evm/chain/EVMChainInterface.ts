import {ChainInterface, TransactionConfirmationOptions} from "@atomiqlabs/base";
import {getLogger, LoggerType} from "../../utils/Utils";
import {
    BrowserProvider,
    JsonRpcApiProvider,
    JsonRpcSigner,
    Signer,
    Transaction,
    TransactionRequest,
    Wallet,
    getAddress
} from "ethers";
import {EVMBlocks, EVMBlockTag} from "./modules/EVMBlocks";
import {EVMEvents} from "./modules/EVMEvents";
import {EVMFees} from "./modules/EVMFees";
import {EVMTokens} from "./modules/EVMTokens";
import {EVMTransactions, EVMTx, SignedEVMTx} from "./modules/EVMTransactions";
import { EVMSignatures } from "./modules/EVMSignatures";
import {EVMAddresses} from "./modules/EVMAddresses";
import {EVMSigner} from "../wallet/EVMSigner";
import {EVMBrowserSigner} from "../wallet/EVMBrowserSigner";

/**
 * Retry policy configuration for EVM RPC calls
 * @category Chain Interface
 */
export type EVMRetryPolicy = {
    maxRetries?: number,
    delay?: number,
    exponential?: boolean
}

/**
 * Configuration options for EVM chain interface
 * @category Chain Interface
 */
export type EVMConfiguration = {
    safeBlockTag: EVMBlockTag,
    finalizedBlockTag: EVMBlockTag,
    maxLogsBlockRange: number,
    maxParallelLogRequests: number,
    maxParallelCalls: number,
    maxLogTopics: number,

    useAccessLists?: boolean,
    defaultAccessListAddresses?: string[],

    finalityCheckStrategy?: {
        type: "timer" | "blocks"
        delayMs?: number
    }
};

/**
 * Main chain interface for interacting with EVM-compatible blockchains
 * @category Chain Interface
 */
export class EVMChainInterface<ChainId extends string = string> implements ChainInterface<EVMTx, SignedEVMTx, EVMSigner, ChainId, Signer> {

    readonly chainId: ChainId;

    readonly provider: JsonRpcApiProvider;
    readonly retryPolicy?: EVMRetryPolicy;

    public readonly evmChainId: number;

    public readonly config: EVMConfiguration;

    public Fees: EVMFees;
    public Tokens: EVMTokens;
    public Transactions: EVMTransactions;
    public Signatures: EVMSignatures;
    public Events: EVMEvents;
    public Blocks: EVMBlocks;

    protected logger: LoggerType;

    constructor(
        chainId: ChainId,
        evmChainId: number,
        provider: JsonRpcApiProvider,
        config: EVMConfiguration,
        retryPolicy?: EVMRetryPolicy,
        evmFeeEstimator: EVMFees = new EVMFees(provider)
    ) {
        this.chainId = chainId;
        this.evmChainId = evmChainId;
        this.provider = provider;
        this.retryPolicy = retryPolicy;
        this.config = config;
        this.config.safeBlockTag ??= "safe";
        this.config.finalizedBlockTag ??= "finalized";
        this.config.finalityCheckStrategy ??= {type: "timer"};
        this.config.finalityCheckStrategy.delayMs ??= 1000;

        this.logger = getLogger("EVMChainInterface("+this.evmChainId+"): ");

        this.Fees = evmFeeEstimator;
        this.Tokens = new EVMTokens(this);
        this.Transactions = new EVMTransactions(this);
        this.Signatures = new EVMSignatures(this);
        this.Events = new EVMEvents(this);
        this.Blocks = new EVMBlocks(this);
    }


    /**
     * @inheritDoc
     */
    async getBalance(signer: string, tokenAddress: string): Promise<bigint> {
        //TODO: For native token we should discount the cost of transactions
        return await this.Tokens.getTokenBalance(signer, tokenAddress);
    }

    /**
     * @inheritDoc
     */
    getNativeCurrencyAddress(): string {
        return this.Tokens.getNativeCurrencyAddress();
    }

    /**
     * @inheritDoc
     */
    isValidToken(tokenIdentifier: string): boolean {
        return this.Tokens.isValidToken(tokenIdentifier);
    }

    /**
     * @inheritDoc
     */
    isValidAddress(address: string): boolean {
        return EVMAddresses.isValidAddress(address);
    }

    /**
     * @inheritDoc
     */
    normalizeAddress(address: string): string {
        return getAddress(address);
    }

    ///////////////////////////////////
    //// Callbacks & handlers
    /**
     * @inheritDoc
     */
    offBeforeTxReplace(callback: (oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>): boolean {
        return true;
    }
    /**
     * @inheritDoc
     */
    onBeforeTxReplace(callback: (oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>): void {}

    /**
     * @inheritDoc
     */
    onBeforeTxSigned(callback: (tx: TransactionRequest) => Promise<void>): void {
        this.Transactions.onBeforeTxSigned(callback);
    }

    /**
     * @inheritDoc
     */
    offBeforeTxSigned(callback: (tx: TransactionRequest) => Promise<void>): boolean {
        return this.Transactions.offBeforeTxSigned(callback);
    }

    /**
     * @inheritDoc
     */
    randomAddress(): string {
        return EVMAddresses.randomAddress();
    }

    /**
     * @inheritDoc
     */
    randomSigner(): EVMSigner {
        const wallet = Wallet.createRandom();
        return new EVMSigner(wallet, wallet.address);
    }

    ////////////////////////////////////////////
    //// Transactions
    /**
     * @inheritDoc
     */
    sendAndConfirm(
        signer: EVMSigner,
        txs: TransactionRequest[],
        waitForConfirmation?: boolean,
        abortSignal?: AbortSignal,
        parallel?: boolean,
        onBeforePublish?: (txId: string, rawTx: string) => Promise<void>,
        useAccessLists?: boolean
    ): Promise<string[]> {
        return this.Transactions.sendAndConfirm(signer, txs, waitForConfirmation, abortSignal, parallel, onBeforePublish, useAccessLists);
    }

    /**
     * @inheritDoc
     */
    sendSignedAndConfirm(
        signedTxs: Transaction[],
        waitForConfirmation?: boolean,
        abortSignal?: AbortSignal,
        parallel?: boolean,
        onBeforePublish?: (txId: string, rawTx: string) => Promise<void>
    ): Promise<string[]> {
        return this.Transactions.sendSignedAndConfirm(signedTxs, waitForConfirmation, abortSignal, parallel, onBeforePublish);
    }

    /**
     * @inheritDoc
     */
    serializeTx(tx: TransactionRequest): Promise<string> {
        return this.Transactions.serializeUnsignedTx(tx);
    }

    /**
     * @inheritDoc
     */
    deserializeTx(txData: string): Promise<TransactionRequest> {
        return Promise.resolve(this.Transactions.deserializeUnsignedTx(txData));
    }

    /**
     * @inheritDoc
     */
    serializeSignedTx(tx: Transaction): Promise<string> {
        return Promise.resolve(this.Transactions.serializeSignedTx(tx));
    }

    /**
     * @inheritDoc
     */
    deserializeSignedTx(txData: string): Promise<Transaction> {
        return Promise.resolve(this.Transactions.deserializeSignedTx(txData));
    }

    /**
     * @inheritDoc
     */
    getTxIdStatus(txId: string): Promise<"not_found" | "pending" | "success" | "reverted"> {
        return this.Transactions.getTxIdStatus(txId);
    }

    /**
     * @inheritDoc
     */
    getTxStatus(tx: string): Promise<"not_found" | "pending" | "success" | "reverted"> {
        return this.Transactions.getTxStatus(tx);
    }

    /**
     * @inheritDoc
     */
    async getFinalizedBlock(): Promise<{ height: number; blockHash: string }> {
        const block = await this.Blocks.getBlock(this.config.finalizedBlockTag);
        return {
            height: block.number,
            blockHash: block.hash!
        };
    }

    /**
     * @inheritDoc
     */
    async txsTransfer(signer: string, token: string, amount: bigint, dstAddress: string, feeRate?: string): Promise<TransactionRequest[]> {
        return [await this.Tokens.Transfer(signer, token, amount, dstAddress, feeRate)];
    }

    /**
     * @inheritDoc
     */
    async transfer(
        signer: EVMSigner,
        token: string,
        amount: bigint,
        dstAddress: string,
        txOptions?: TransactionConfirmationOptions
    ): Promise<string> {
        const tx = await this.Tokens.Transfer(signer.getAddress(), token, amount, dstAddress, txOptions?.feeRate);
        const [txId] = await this.Transactions.sendAndConfirm(signer, [tx], txOptions?.waitForConfirmation, txOptions?.abortSignal, false);
        return txId;
    }

    /**
     * @inheritDoc
     */
    async wrapSigner(signer: Signer): Promise<EVMSigner> {
        const address = await signer.getAddress();
        if(signer instanceof JsonRpcSigner || signer.provider instanceof BrowserProvider) {
            return new EVMBrowserSigner(signer, address);
        }
        return new EVMSigner(signer, address);
    }

}