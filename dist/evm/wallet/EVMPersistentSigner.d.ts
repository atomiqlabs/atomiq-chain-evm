import { Signer, TransactionRequest, TransactionResponse } from "ethers";
import { EVMBlockTag } from "../chain/modules/EVMBlocks";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import { EVMSigner } from "./EVMSigner";
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
    private priorSavePromise;
    private saveCount;
    private save;
    private checkPastTransactions;
    private startFeeBumper;
    init(): Promise<void>;
    stop(): Promise<void>;
    private readonly sendTransactionQueue;
    sendTransaction(transaction: TransactionRequest, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<TransactionResponse>;
}
