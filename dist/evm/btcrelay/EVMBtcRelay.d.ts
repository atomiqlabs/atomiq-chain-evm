/// <reference types="node" />
/// <reference types="node" />
import { BitcoinNetwork, BitcoinRpc, BtcBlock, BtcRelay, RelaySynchronizer } from "@atomiqlabs/base";
import { EVMBtcHeader } from "./headers/EVMBtcHeader";
import { EVMContractBase } from "../contract/EVMContractBase";
import { BtcRelay as BtcRelayTypechain } from "./BtcRelayTypechain";
import { EVMBtcStoredHeader } from "./headers/EVMBtcStoredHeader";
import { EVMSigner } from "../wallet/EVMSigner";
import { EVMTx } from "../chain/modules/EVMTransactions";
import { EVMChainInterface } from "../chain/EVMChainInterface";
/**
 * @category BTC Relay
 */
export declare class EVMBtcRelay<B extends BtcBlock> extends EVMContractBase<BtcRelayTypechain> implements BtcRelay<EVMBtcStoredHeader, EVMTx, B, EVMSigner> {
    static GasCosts: {
        GAS_PER_BLOCKHEADER: number;
        GAS_BASE_MAIN: number;
        GAS_PER_BLOCKHEADER_FORK: number;
        GAS_PER_BLOCKHEADER_FORKED: number;
        GAS_BASE_FORK: number;
    };
    SaveMainHeaders(signer: string, mainHeaders: EVMBtcHeader[], storedHeader: EVMBtcStoredHeader, feeRate: string): Promise<EVMTx>;
    SaveShortForkHeaders(signer: string, forkHeaders: EVMBtcHeader[], storedHeader: EVMBtcStoredHeader, feeRate: string): Promise<EVMTx>;
    SaveLongForkHeaders(signer: string, forkId: number, forkHeaders: EVMBtcHeader[], storedHeader: EVMBtcStoredHeader, feeRate: string, totalForkHeaders?: number): Promise<EVMTx>;
    bitcoinRpc: BitcoinRpc<B>;
    readonly maxHeadersPerTx: number;
    readonly maxForkHeadersPerTx: number;
    readonly maxShortForkHeadersPerTx: number;
    constructor(chainInterface: EVMChainInterface<any>, bitcoinRpc: BitcoinRpc<B>, bitcoinNetwork: BitcoinNetwork, contractAddress: string, contractDeploymentHeight?: number);
    /**
     * Computes subsequent commited headers as they will appear on the blockchain when transactions
     *  are submitted & confirmed
     *
     * @param initialStoredHeader
     * @param syncedHeaders
     * @private
     */
    private computeCommitedHeaders;
    /**
     * A common logic for submitting blockheaders in a transaction
     *
     * @param signer
     * @param headers headers to sync to the btc relay
     * @param storedHeader current latest stored block header for a given fork
     * @param forkId forkId to submit to, forkId=0 means main chain, forkId=-1 means short fork
     * @param feeRate feeRate for the transaction
     * @param totalForkHeaders Total number of headers in a fork
     * @private
     */
    private _saveHeaders;
    private findStoredBlockheaderInTraces;
    private commitHashCache;
    private blockHashCache;
    private getBlock;
    private getBlockHeight;
    /**
     * @inheritDoc
     */
    getTipData(): Promise<{
        commitHash: string;
        blockhash: string;
        chainWork: Buffer;
        blockheight: number;
    } | null>;
    /**
     * @inheritDoc
     */
    retrieveLogAndBlockheight(blockData: {
        blockhash: string;
    }, requiredBlockheight?: number): Promise<{
        header: EVMBtcStoredHeader;
        height: number;
    } | null>;
    /**
     * @inheritDoc
     */
    retrieveLogByCommitHash(commitmentHashStr: string, blockData: {
        blockhash: string;
    }): Promise<EVMBtcStoredHeader | null>;
    /**
     * @inheritDoc
     */
    retrieveLatestKnownBlockLog(): Promise<{
        resultStoredHeader: EVMBtcStoredHeader;
        resultBitcoinHeader: B;
    } | null>;
    /**
     * @inheritDoc
     */
    saveMainHeaders(signer: string, mainHeaders: BtcBlock[], storedHeader: EVMBtcStoredHeader, feeRate?: string): Promise<{
        forkId: number;
        lastStoredHeader: EVMBtcStoredHeader;
        tx: import("ethers").TransactionRequest;
        computedCommitedHeaders: EVMBtcStoredHeader[];
    }>;
    /**
     * @inheritDoc
     */
    saveNewForkHeaders(signer: string, forkHeaders: BtcBlock[], storedHeader: EVMBtcStoredHeader, tipWork: Buffer, feeRate?: string): Promise<{
        forkId: number;
        lastStoredHeader: EVMBtcStoredHeader;
        tx: import("ethers").TransactionRequest;
        computedCommitedHeaders: EVMBtcStoredHeader[];
    }>;
    /**
     * @inheritDoc
     */
    saveForkHeaders(signer: string, forkHeaders: BtcBlock[], storedHeader: EVMBtcStoredHeader, forkId: number, tipWork: Buffer, feeRate?: string): Promise<{
        forkId: number;
        lastStoredHeader: EVMBtcStoredHeader;
        tx: import("ethers").TransactionRequest;
        computedCommitedHeaders: EVMBtcStoredHeader[];
    }>;
    /**
     * @inheritDoc
     */
    saveShortForkHeaders(signer: string, forkHeaders: BtcBlock[], storedHeader: EVMBtcStoredHeader, tipWork: Buffer, feeRate?: string): Promise<{
        forkId: number;
        lastStoredHeader: EVMBtcStoredHeader;
        tx: import("ethers").TransactionRequest;
        computedCommitedHeaders: EVMBtcStoredHeader[];
    }>;
    /**
     * @inheritDoc
     */
    estimateSynchronizeFee(requiredBlockheight: number, feeRate?: string): Promise<bigint>;
    /**
     * @inheritDoc
     */
    getFeePerBlock(feeRate?: string): Promise<bigint>;
    /**
     * @inheritDoc
     */
    getMainFeeRate(signer: string | null): Promise<string>;
    /**
     * @inheritDoc
     */
    getForkFeeRate(signer: string, forkId: number): Promise<string>;
    /**
     * @inheritDoc
     */
    saveInitialHeader(signer: string, header: B, epochStart: number, pastBlocksTimestamps: number[], feeRate?: string): Promise<EVMTx>;
    /**
     * Gets committed header, identified by blockhash & blockheight, determines required BTC relay blockheight based on
     *  requiredConfirmations
     * If synchronizer is passed & blockhash is not found, it produces transactions to sync up the btc relay to the
     *  current chain tip & adds them to the txs array
     *
     * @param signer
     * @param btcRelay
     * @param btcTxs
     * @param txs solana transaction array, in case we need to synchronize the btc relay ourselves the synchronization
     *  txns are added here
     * @param synchronizer optional synchronizer to use to synchronize the btc relay in case it is not yet synchronized
     *  to the required blockheight
     * @param feeRate Fee rate to use for synchronization transactions
     * @private
     */
    static getCommitedHeadersAndSynchronize(signer: string, btcRelay: EVMBtcRelay<any>, btcTxs: {
        blockheight: number;
        requiredConfirmations: number;
        blockhash: string;
    }[], txs: EVMTx[], synchronizer?: RelaySynchronizer<EVMBtcStoredHeader, EVMTx, any>, feeRate?: string): Promise<{
        [blockhash: string]: EVMBtcStoredHeader;
    } | null>;
}
