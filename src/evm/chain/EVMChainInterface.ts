import {ChainInterface, TransactionConfirmationOptions} from "@atomiqlabs/base";
import {getLogger, LoggerType} from "../../utils/Utils";
import {JsonRpcApiProvider, Transaction, TransactionRequest, Wallet} from "ethers";
import {EVMBlocks, EVMBlockTag} from "./modules/EVMBlocks";
import {EVMEvents} from "./modules/EVMEvents";
import {EVMFees} from "./modules/EVMFees";
import {EVMTokens} from "./modules/EVMTokens";
import { EVMTransactions } from "./modules/EVMTransactions";
import { EVMSignatures } from "./modules/EVMSignatures";
import {EVMAddresses} from "./modules/EVMAddresses";
import {EVMSigner} from "../wallet/EVMSigner";

export type EVMRetryPolicy = {
    maxRetries?: number,
    delay?: number,
    exponential?: boolean
}

export type EVMConfiguration = {
    safeBlockTag: EVMBlockTag,
    maxLogsBlockRange: number
};

export class EVMChainInterface<ChainId extends string = string> implements ChainInterface {

    readonly chainId: ChainId;

    readonly provider: JsonRpcApiProvider;
    readonly retryPolicy: EVMRetryPolicy;

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

        this.logger = getLogger("EVMChainInterface("+this.evmChainId+"): ");

        this.Fees = evmFeeEstimator;
        this.Tokens = new EVMTokens(this);
        this.Transactions = new EVMTransactions(this);
        this.Signatures = new EVMSignatures(this);
        this.Events = new EVMEvents(this);
        this.Blocks = new EVMBlocks(this);
    }


    async getBalance(signer: string, tokenAddress: string): Promise<bigint> {
        //TODO: For native token we should discount the cost of transactions
        return await this.Tokens.getTokenBalance(signer, tokenAddress);
    }

    getNativeCurrencyAddress(): string {
        return this.Tokens.getNativeCurrencyAddress();
    }

    isValidToken(tokenIdentifier: string): boolean {
        return this.Tokens.isValidToken(tokenIdentifier);
    }

    isValidAddress(address: string): boolean {
        return EVMAddresses.isValidAddress(address);
    }

    ///////////////////////////////////
    //// Callbacks & handlers
    offBeforeTxReplace(callback: (oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>): boolean {
        return true;
    }
    onBeforeTxReplace(callback: (oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>): void {}

    onBeforeTxSigned(callback: (tx: TransactionRequest) => Promise<void>): void {
        this.Transactions.onBeforeTxSigned(callback);
    }

    offBeforeTxSigned(callback: (tx: TransactionRequest) => Promise<void>): boolean {
        return this.Transactions.offBeforeTxSigned(callback);
    }

    randomAddress(): string {
        return EVMAddresses.randomAddress();
    }

    randomSigner(): EVMSigner {
        const wallet = Wallet.createRandom();
        return new EVMSigner(wallet, wallet.address);
    }

    ////////////////////////////////////////////
    //// Transactions
    sendAndConfirm(
        signer: EVMSigner,
        txs: TransactionRequest[],
        waitForConfirmation?: boolean,
        abortSignal?: AbortSignal,
        parallel?: boolean,
        onBeforePublish?: (txId: string, rawTx: string) => Promise<void>
    ): Promise<string[]> {
        return this.Transactions.sendAndConfirm(signer, txs, waitForConfirmation, abortSignal, parallel, onBeforePublish);
    }

    serializeTx(tx: Transaction): Promise<string> {
        return this.Transactions.serializeTx(tx);
    }

    deserializeTx(txData: string): Promise<Transaction> {
        return this.Transactions.deserializeTx(txData);
    }

    getTxIdStatus(txId: string): Promise<"not_found" | "pending" | "success" | "reverted"> {
        return this.Transactions.getTxIdStatus(txId);
    }

    getTxStatus(tx: string): Promise<"not_found" | "pending" | "success" | "reverted"> {
        return this.Transactions.getTxStatus(tx);
    }

    async txsTransfer(signer: string, token: string, amount: bigint, dstAddress: string, feeRate?: string): Promise<TransactionRequest[]> {
        return [await this.Tokens.Transfer(signer, token, amount, dstAddress, feeRate)];
    }

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

}