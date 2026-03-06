import { Signer, TransactionRequest, TransactionResponse } from "ethers";
import { EVMBlockTag } from "../chain/modules/EVMBlocks";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import { EVMSigner } from "./EVMSigner";
/**
 * A robust EVM signer implementation with internal nonce management, automatic rebroadcasting and fee bumping.
 * Uses Node.js `fs` to persist transaction data across restarts, so it is intended for backend runtimes.
 *
 * @category Wallets
 */
export declare class EVMPersistentSigner extends EVMSigner {
    readonly safeBlockTag: EVMBlockTag;
    private pendingTxs;
    private confirmedNonce;
    private pendingNonce;
    private feeBumper;
    private stopped;
    private readonly directory;
    private readonly waitBeforeBump;
    private readonly minFeeIncreaseAbsolute;
    private readonly minFeeIncreasePpm;
    private readonly chainInterface;
    private readonly logger;
    constructor(account: Signer, address: string, chainInterface: EVMChainInterface, directory: string, minFeeIncreaseAbsolute?: bigint, minFeeIncreasePpm?: bigint, waitBeforeBumpMillis?: number);
    private load;
    private priorSavePromise?;
    private saveCount;
    private save;
    private checkPastTransactions;
    private startFeeBumper;
    private syncNonceFromChain;
    /**
     * @inheritDoc
     */
    init(): Promise<void>;
    /**
     * @inheritDoc
     */
    stop(): Promise<void>;
    private readonly sendTransactionQueue;
    sendTransaction(transaction: TransactionRequest, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<TransactionResponse>;
}
