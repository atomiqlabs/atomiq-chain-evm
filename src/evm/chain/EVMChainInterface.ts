import {BitcoinNetwork, ChainInterface, TransactionConfirmationOptions} from "@atomiqlabs/base";
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
    /**
     * Maximum retries to be attempted
     */
    maxRetries?: number,
    /**
     * Default delay between retries
     */
    delay?: number,
    /**
     * Whether the delays should scale exponentially, i.e. 1 second, 2 seconds, 4 seconds, 8 seconds
     */
    exponential?: boolean
}

/**
 * Configuration options for EVM chain interface
 * @category Chain Interface
 */
export type EVMConfiguration = {
    /**
     * EVM Block tag to be considered safe for financial application, i.e. sending assets on different blockchains
     */
    safeBlockTag: EVMBlockTag,
    /**
     * EVM Block tag to be considered finalized, i.e. the state definitely cannot revert after the blocks gets
     *  this level of finality
     */
    finalizedBlockTag: EVMBlockTag,
    /**
     * Maximum range of blocks to query when querying `ethereum_getLogs` RPC endpoint.
     */
    maxLogsBlockRange: number,
    /**
     * Maximum number of `ethereum_getLogs` RPC calls to be executed in parallel
     */
    maxParallelLogRequests: number,
    /**
     * Maximum number of parallel contract calls to execute in batch functions
     */
    maxParallelCalls: number,
    /**
     * Maximum number of topics specified in the `ethereum_getLogs` RPC call
     */
    maxLogTopics: number,

    /**
     * Whether to use EIP-2930 access lists for transactions, if set to `true` the transaction is simulated before
     *  sending and the access list is populated for the transaction
     */
    useAccessLists?: boolean,
    /**
     * Default EIP-2930 addresses to add when simulating the transaction initially
     */
    defaultAccessListAddresses?: string[],

    /**
     * Strategy for checking finality of transactions or events
     */
    finalityCheckStrategy?: {
        /**
         * Type of the finality checking strategy:
         * - `"timer"` - periodically checks for the finality status, set the interval period `delayMs`
         * - `"blocks"` - check for the finality when new block is created
         */
        type: "timer" | "blocks"
        /**
         * Interval in milliseconds to use for the `"timer"` type of finality checking strategy
         */
        delayMs?: number
    }
};

/**
 * Main chain interface for interacting with EVM-compatible blockchains
 * @category Chain Interface
 */
export class EVMChainInterface<ChainId extends string = string> implements ChainInterface<EVMTx, SignedEVMTx, EVMSigner, ChainId, Signer> {

    public readonly chainId: ChainId;
    public readonly provider: JsonRpcApiProvider;
    public readonly evmChainId: number;

    /**
     * @internal
     */
    readonly _retryPolicy?: EVMRetryPolicy;
    /**
     * @internal
     */
    readonly _config: EVMConfiguration;

    public Fees: EVMFees;
    public Tokens: EVMTokens;
    public Transactions: EVMTransactions;
    public Signatures: EVMSignatures;
    public Events: EVMEvents;
    public Blocks: EVMBlocks;

    /**
     * @internal
     */
    protected logger: LoggerType;

    private readonly bitcoinNetwork?: BitcoinNetwork;

    constructor(
        chainId: ChainId,
        evmChainId: number,
        provider: JsonRpcApiProvider,
        config: EVMConfiguration,
        retryPolicy?: EVMRetryPolicy,
        evmFeeEstimator: EVMFees = new EVMFees(provider),
        bitcoinNetwork?: BitcoinNetwork
    ) {
        this.chainId = chainId;
        this.evmChainId = evmChainId;
        this.provider = provider;
        this._retryPolicy = retryPolicy;
        this._config = config;
        this._config.safeBlockTag ??= "safe";
        this._config.finalizedBlockTag ??= "finalized";
        this._config.finalityCheckStrategy ??= {type: "timer"};
        this._config.finalityCheckStrategy.delayMs ??= 1000;

        this.bitcoinNetwork = bitcoinNetwork;

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
    async prepareTxs(txs: EVMTx[]): Promise<EVMTx[]> {
        await this.Transactions.prepareTransactions(txs);
        return txs;
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
        const block = await this.Blocks.getBlock(this._config.finalizedBlockTag);
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

    async verifyNetwork(bitcoinNetwork: BitcoinNetwork): Promise<void> {
        if(this.bitcoinNetwork!=null && bitcoinNetwork!==this.bitcoinNetwork)
            throw new Error(`Network mismatch, the chain interface was not setup for ${BitcoinNetwork[bitcoinNetwork]}, chain interface network: ${BitcoinNetwork[this.bitcoinNetwork]}`);

        const network = await this.provider.getNetwork();
        if(network.chainId!==BigInt(this.evmChainId))
            throw new Error(`Network mismatch, the underlying RPC provider isn't using the correct chainId, expected: ${this.evmChainId}, provider returned: ${network.chainId.toString(10)}`);
    }

}