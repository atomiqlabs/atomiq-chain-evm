import {BitcoinNetwork, BitcoinRpc, BtcBlock, BtcRelay, RelaySynchronizer, StatePredictorUtils} from "@atomiqlabs/base";
import {EVMBtcHeader} from "./headers/EVMBtcHeader";
import {getLogger, tryWithRetries} from "../../utils/Utils";
import {EVMContractBase, TypedFunctionCall} from "../contract/EVMContractBase";
import {BtcRelay as BtcRelayTypechain} from "./BtcRelayTypechain";
import {EVMBtcStoredHeader} from "./headers/EVMBtcStoredHeader";
import {EVMSigner} from "../wallet/EVMSigner";
import {EVMTx, EVMTxTrace} from "../chain/modules/EVMTransactions";
import {EVMFees} from "../chain/modules/EVMFees";
import {EVMChainInterface} from "../chain/EVMChainInterface";
import {BtcRelayAbi} from "./BtcRelayAbi";
import {AbiCoder, hexlify} from "ethers";
import {PromiseLruCache} from "promise-cache-ts";

function serializeBlockHeader(e: BtcBlock): EVMBtcHeader {
    return new EVMBtcHeader({
        version: e.getVersion(),
        previousBlockhash: Buffer.from(e.getPrevBlockhash(), "hex").reverse(),
        merkleRoot: Buffer.from(e.getMerkleRoot(), "hex").reverse(),
        timestamp: e.getTimestamp(),
        nbits: e.getNbits(),
        nonce: e.getNonce(),
        hash: Buffer.from(e.getHash(), "hex").reverse()
    });
}

const logger = getLogger("EVMBtcRelay: ");

/**
 * @category BTC Relay
 */
export class EVMBtcRelay<B extends BtcBlock>
    extends EVMContractBase<BtcRelayTypechain>
    implements BtcRelay<EVMBtcStoredHeader, EVMTx, B, EVMSigner> {

    public static GasCosts = {
        GAS_PER_BLOCKHEADER: 30_000,
        GAS_BASE_MAIN: 15_000 + 21_000,
        GAS_PER_BLOCKHEADER_FORK: 65_000,
        GAS_PER_BLOCKHEADER_FORKED: 10_000,
        GAS_BASE_FORK: 25_000 + 21_000
    }

    public async SaveMainHeaders(signer: string, mainHeaders: EVMBtcHeader[], storedHeader: EVMBtcStoredHeader, feeRate: string): Promise<EVMTx> {
        const tx = await this.contract.submitMainBlockheaders.populateTransaction(Buffer.concat([
            storedHeader.serialize(),
            Buffer.concat(mainHeaders.map(header => header.serializeCompact()))
        ]));
        tx.from = signer;
        EVMFees.applyFeeRate(tx, EVMBtcRelay.GasCosts.GAS_BASE_MAIN + (EVMBtcRelay.GasCosts.GAS_PER_BLOCKHEADER * mainHeaders.length), feeRate);
        return tx;
    }

    public async SaveShortForkHeaders(signer: string, forkHeaders: EVMBtcHeader[], storedHeader: EVMBtcStoredHeader, feeRate: string): Promise<EVMTx> {
        const tx = await this.contract.submitShortForkBlockheaders.populateTransaction(Buffer.concat([
            storedHeader.serialize(),
            Buffer.concat(forkHeaders.map(header => header.serializeCompact()))
        ]));
        tx.from = signer;
        EVMFees.applyFeeRate(tx, EVMBtcRelay.GasCosts.GAS_BASE_MAIN + (EVMBtcRelay.GasCosts.GAS_PER_BLOCKHEADER * forkHeaders.length), feeRate);
        return tx;
    }

    public async SaveLongForkHeaders(signer: string, forkId: number, forkHeaders: EVMBtcHeader[], storedHeader: EVMBtcStoredHeader, feeRate: string, totalForkHeaders: number = 100): Promise<EVMTx> {
        const tx = await this.contract.submitForkBlockheaders.populateTransaction(forkId, Buffer.concat([
            storedHeader.serialize(),
            Buffer.concat(forkHeaders.map(header => header.serializeCompact()))
        ]));
        tx.from = signer;
        EVMFees.applyFeeRate(tx, EVMBtcRelay.GasCosts.GAS_BASE_FORK + (EVMBtcRelay.GasCosts.GAS_PER_BLOCKHEADER_FORK * forkHeaders.length) + (EVMBtcRelay.GasCosts.GAS_PER_BLOCKHEADER_FORKED * totalForkHeaders), feeRate);
        return tx;
    }

    bitcoinRpc: BitcoinRpc<B>;

    readonly maxHeadersPerTx: number = 100;
    readonly maxForkHeadersPerTx: number = 50;
    readonly maxShortForkHeadersPerTx: number = 100;

    constructor(
        chainInterface: EVMChainInterface<any>,
        bitcoinRpc: BitcoinRpc<B>,
        bitcoinNetwork: BitcoinNetwork,
        contractAddress: string,
        contractDeploymentHeight?: number
    ) {
        super(chainInterface, contractAddress, BtcRelayAbi, contractDeploymentHeight);
        this.bitcoinRpc = bitcoinRpc;
    }

    /**
     * Computes subsequent commited headers as they will appear on the blockchain when transactions
     *  are submitted & confirmed
     *
     * @param initialStoredHeader
     * @param syncedHeaders
     * @private
     */
    private computeCommitedHeaders(initialStoredHeader: EVMBtcStoredHeader, syncedHeaders: EVMBtcHeader[]) {
        const computedCommitedHeaders = [initialStoredHeader];
        for(let blockHeader of syncedHeaders) {
            computedCommitedHeaders.push(computedCommitedHeaders[computedCommitedHeaders.length-1].computeNext(blockHeader));
        }
        return computedCommitedHeaders;
    }

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
    private async _saveHeaders(
        signer: string,
        headers: BtcBlock[],
        storedHeader: EVMBtcStoredHeader,
        forkId: number,
        feeRate: string,
        totalForkHeaders: number
    ) {
        const blockHeaderObj = headers.map(serializeBlockHeader);
        let tx: EVMTx;
        switch(forkId) {
            case -1:
                tx = await this.SaveShortForkHeaders(signer, blockHeaderObj, storedHeader, feeRate);
                break;
            case 0:
                tx = await this.SaveMainHeaders(signer, blockHeaderObj, storedHeader, feeRate);
                break;
            default:
                tx = await this.SaveLongForkHeaders(signer, forkId, blockHeaderObj, storedHeader, feeRate, totalForkHeaders);
                break;
        }

        const computedCommitedHeaders = this.computeCommitedHeaders(storedHeader, blockHeaderObj);
        const lastStoredHeader = computedCommitedHeaders[computedCommitedHeaders.length-1];

        return {
            forkId: forkId,
            lastStoredHeader,
            tx,
            computedCommitedHeaders
        }
    }

    private async findStoredBlockheaderInTraces(txTrace: EVMTxTrace, commitHash: string): Promise<EVMBtcStoredHeader | null> {
        if(txTrace.to.toLowerCase() === (await this.contract.getAddress()).toLowerCase()) {
            let dataBuffer: Buffer | null = null;
            if(txTrace.type==="CREATE") {
                dataBuffer = Buffer.from(txTrace.input.substring(txTrace.input.length-384, txTrace.input.length-64), "hex");
            } else {
                const result = this.parseCalldata(txTrace.input);
                if(result!=null) {
                    if(result.name==="submitMainBlockheaders" || result.name==="submitShortForkBlockheaders") {
                        const functionCall: TypedFunctionCall<
                            // @ts-ignore
                            typeof this.contract.submitMainBlockheaders | typeof this.contract.submitShortForkBlockheaders
                        > = result;
                        dataBuffer = Buffer.from(hexlify(functionCall.args[0]).substring(2), "hex");
                    } else if(result.name==="submitForkBlockheaders") {
                        const functionCall: TypedFunctionCall<
                            // @ts-ignore
                            typeof this.contract.submitForkBlockheaders
                        > = result;
                        dataBuffer = Buffer.from(hexlify(functionCall.args[1]).substring(2), "hex");
                    }
                }
            }
            if(dataBuffer!=null) {
                let storedHeader = EVMBtcStoredHeader.deserialize(dataBuffer.subarray(0, 160));
                if(storedHeader.getCommitHash()===commitHash) return storedHeader;
                for(let i = 160; i < dataBuffer.length; i+=48) {
                    const blockHeader = EVMBtcHeader.deserialize(dataBuffer.subarray(i, i + 48));
                    storedHeader = storedHeader.computeNext(blockHeader);
                    if(storedHeader.getCommitHash()===commitHash) return storedHeader;
                }
            }
        }

        if(txTrace.calls!=null) {
            for(let call of txTrace.calls) {
                const result = await this.findStoredBlockheaderInTraces(call, commitHash);
                if(result!=null) return result;
            }
        }

        return null;
    }

    private commitHashCache = new PromiseLruCache<string, [EVMBtcStoredHeader, string] | null>(1000);
    private blockHashCache = new PromiseLruCache<string, [EVMBtcStoredHeader, string] | null>(1000);

    private getBlock(commitHash?: string, blockHash?: Buffer): Promise<[EVMBtcStoredHeader, string] | null> {
        const blockHashString = blockHash==null ? null : "0x"+Buffer.from([...blockHash]).reverse().toString("hex");

        const generator = () => this.Events.findInContractEvents<[EVMBtcStoredHeader, string] | null, "StoreHeader" | "StoreForkHeader">(
            ["StoreHeader", "StoreForkHeader"],
            [
                commitHash ?? null,
                blockHashString
            ],
            async (event) => {
                const txTrace = await this.Chain.Transactions.traceTransaction(event.transactionHash);
                const storedBlockheader = await this.findStoredBlockheaderInTraces(txTrace, event.args.commitHash);
                if(storedBlockheader==null) return null;

                this.commitHashCache.set(event.args.commitHash, Promise.resolve([storedBlockheader, event.args.commitHash]));
                this.blockHashCache.set(event.args.blockHash, Promise.resolve([storedBlockheader, event.args.commitHash]));
                return [storedBlockheader, event.args.commitHash];
            }
        );

        if(commitHash!=null) return this.commitHashCache.getOrComputeAsync(commitHash, generator);
        if(blockHashString!=null) return this.blockHashCache.getOrComputeAsync(blockHashString, generator);

        return Promise.resolve(null);
    }

    private async getBlockHeight(): Promise<number> {
        return Number(await this.contract.getBlockheight());
    }

    /**
     * Returns data about current main chain tip stored in the btc relay
     */
    public async getTipData(): Promise<{ commitHash: string; blockhash: string, chainWork: Buffer, blockheight: number } | null> {
        const commitHash = await this.contract.getTipCommitHash();
        if(commitHash==null || BigInt(commitHash)===BigInt(0)) return null;

        const result = await this.getBlock(commitHash);
        if(result==null) return null;

        const storedBlockHeader = result[0];

        return {
            blockheight: storedBlockHeader.getBlockheight(),
            commitHash: commitHash,
            blockhash: storedBlockHeader.getBlockHash().toString("hex"),
            chainWork: storedBlockHeader.getChainWork()
        };
    }

    /**
     * Retrieves blockheader with a specific blockhash, returns null if requiredBlockheight is provided and
     *  btc relay contract is not synced up to the desired blockheight
     *
     * @param blockData
     * @param requiredBlockheight
     */
    public async retrieveLogAndBlockheight(blockData: {blockhash: string}, requiredBlockheight?: number): Promise<{
        header: EVMBtcStoredHeader,
        height: number
    } | null> {
        //TODO: we can fetch the blockheight and events in parallel
        const blockHeight = await this.getBlockHeight();
        if(requiredBlockheight!=null && blockHeight < requiredBlockheight) {
            return null;
        }
        const result = await this.getBlock(undefined, Buffer.from(blockData.blockhash, "hex"));
        if(result==null) return null;

        const [storedBlockHeader, commitHash] = result;

        //Check if block is part of the main chain
        const chainCommitment = await this.contract.getCommitHash(storedBlockHeader.blockHeight);
        if(chainCommitment!==commitHash) return null;

        logger.debug("retrieveLogAndBlockheight(): block found," +
            " commit hash: "+commitHash+" blockhash: "+blockData.blockhash+" current btc relay height: "+blockHeight);

        return {header: storedBlockHeader, height: blockHeight};
    }

    /**
     * Retrieves blockheader data by blockheader's commit hash,
     *
     * @param commitmentHashStr
     * @param blockData
     */
    public async retrieveLogByCommitHash(commitmentHashStr: string, blockData: {blockhash: string}): Promise<EVMBtcStoredHeader | null> {
        const result = await this.getBlock(commitmentHashStr, Buffer.from(blockData.blockhash, "hex"));
        if(result==null) return null;

        const [storedBlockHeader, commitHash] = result;

        //Check if block is part of the main chain
        const chainCommitment = await this.contract.getCommitHash(storedBlockHeader.blockHeight);
        if(chainCommitment!==commitHash) return null;

        logger.debug("retrieveLogByCommitHash(): block found," +
            " commit hash: "+commitmentHashStr+" blockhash: "+blockData.blockhash+" height: "+storedBlockHeader.blockHeight);

        return storedBlockHeader;
    }

    /**
     * Retrieves latest known stored blockheader & blockheader from bitcoin RPC that is in the main chain
     */
    public async retrieveLatestKnownBlockLog(): Promise<{
        resultStoredHeader: EVMBtcStoredHeader,
        resultBitcoinHeader: B
    } | null> {
        const data = await this.Events.findInContractEvents(
            ["StoreHeader", "StoreForkHeader"],
            null,
            async (event) => {
                const blockHashHex = Buffer.from(event.args.blockHash.substring(2), "hex").reverse().toString("hex");
                const commitHash = event.args.commitHash;

                const isInBtcMainChain = await this.bitcoinRpc.isInMainChain(blockHashHex).catch(() => false);
                if(!isInBtcMainChain) return null;

                const blockHeader = await this.bitcoinRpc.getBlockHeader(blockHashHex);
                if(blockHeader==null) return null;

                if(commitHash !== await this.contract.getCommitHash(blockHeader.getHeight())) return null;

                const txTrace = await this.Chain.Transactions.traceTransaction(event.transactionHash);
                const storedHeader = await this.findStoredBlockheaderInTraces(txTrace, commitHash);
                if(storedHeader==null) return null;

                return {
                    resultStoredHeader: storedHeader,
                    resultBitcoinHeader: blockHeader,
                    commitHash: commitHash
                }
            }
        )

        if(data!=null) logger.debug("retrieveLatestKnownBlockLog(): block found," +
            " commit hash: "+data.commitHash+" blockhash: "+data.resultBitcoinHeader.getHash()+
            " height: "+data.resultStoredHeader.getBlockheight());

        return data;
    }

    /**
     * Saves blockheaders as a bitcoin main chain to the btc relay
     *
     * @param signer
     * @param mainHeaders
     * @param storedHeader
     * @param feeRate
     */
    public async saveMainHeaders(signer: string, mainHeaders: BtcBlock[], storedHeader: EVMBtcStoredHeader, feeRate?: string) {
        feeRate ??= await this.Chain.Fees.getFeeRate();
        logger.debug("saveMainHeaders(): submitting main blockheaders, count: "+mainHeaders.length);
        return this._saveHeaders(signer, mainHeaders, storedHeader, 0, feeRate, 0);
    }

    /**
     * Creates a new long fork and submits the headers to it
     *
     * @param signer
     * @param forkHeaders
     * @param storedHeader
     * @param tipWork
     * @param feeRate
     */
    public async saveNewForkHeaders(signer: string, forkHeaders: BtcBlock[], storedHeader: EVMBtcStoredHeader, tipWork: Buffer, feeRate?: string) {
        let forkId: number = Math.floor(Math.random() * 0xFFFFFFFFFFFF);
        feeRate ??= await this.Chain.Fees.getFeeRate();

        logger.debug("saveNewForkHeaders(): submitting new fork & blockheaders," +
            " count: "+forkHeaders.length+" forkId: 0x"+forkId.toString(16));

        const result = await this._saveHeaders(signer, forkHeaders, storedHeader, forkId, feeRate, 100);
        if(result.forkId!==0 && StatePredictorUtils.gtBuffer(result.lastStoredHeader.getChainWork(), tipWork)) {
            //Fork's work is higher than main chain's work, this fork will become a main chain
            result.forkId = 0;
        }
        return result;
    }

    /**
     * Continues submitting blockheaders to a given fork
     *
     * @param signer
     * @param forkHeaders
     * @param storedHeader
     * @param forkId
     * @param tipWork
     * @param feeRate
     */
    public async saveForkHeaders(signer: string, forkHeaders: BtcBlock[], storedHeader: EVMBtcStoredHeader, forkId: number, tipWork: Buffer, feeRate?: string) {
        feeRate ??= await this.Chain.Fees.getFeeRate();

        logger.debug("saveForkHeaders(): submitting blockheaders to existing fork," +
            " count: "+forkHeaders.length+" forkId: 0x"+forkId.toString(16));

        const result = await this._saveHeaders(signer, forkHeaders, storedHeader, forkId, feeRate, 100);
        if(result.forkId!==0 && StatePredictorUtils.gtBuffer(result.lastStoredHeader.getChainWork(), tipWork)) {
            //Fork's work is higher than main chain's work, this fork will become a main chain
            result.forkId = 0;
        }
        return result;
    }

    /**
     * Submits short fork with given blockheaders
     *
     * @param signer
     * @param forkHeaders
     * @param storedHeader
     * @param tipWork
     * @param feeRate
     */
    public async saveShortForkHeaders(signer: string, forkHeaders: BtcBlock[], storedHeader: EVMBtcStoredHeader, tipWork: Buffer, feeRate?: string) {
        feeRate ??= await this.Chain.Fees.getFeeRate();

        logger.debug("saveShortForkHeaders(): submitting short fork blockheaders," +
            " count: "+forkHeaders.length);

        const result = await this._saveHeaders(signer, forkHeaders, storedHeader, -1, feeRate, 0);
        if(result.forkId!==0 && StatePredictorUtils.gtBuffer(result.lastStoredHeader.getChainWork(), tipWork)) {
            //Fork's work is higher than main chain's work, this fork will become a main chain
            result.forkId = 0;
        }
        return result;
    }

    /**
     * Estimate required synchronization fee (worst case) to synchronize btc relay to the required blockheight
     *
     * @param requiredBlockheight
     * @param feeRate
     */
    public async estimateSynchronizeFee(requiredBlockheight: number, feeRate?: string): Promise<bigint> {
        feeRate ??= await this.Chain.Fees.getFeeRate();

        const tipData = await this.getTipData();
        if(tipData==null) throw new Error("Cannot get relay tip data, relay not initialized?");
        const currBlockheight = tipData.blockheight;

        const blockheightDelta = requiredBlockheight-currBlockheight;

        if(blockheightDelta<=0) return 0n;

        const synchronizationFee = (BigInt(blockheightDelta) * await this.getFeePerBlock(feeRate))
            + EVMFees.getGasFee(EVMBtcRelay.GasCosts.GAS_BASE_MAIN * Math.ceil(blockheightDelta / this.maxHeadersPerTx), feeRate);
        logger.debug("estimateSynchronizeFee(): required blockheight: "+requiredBlockheight+
            " blockheight delta: "+blockheightDelta+" fee: "+synchronizationFee.toString(10));

        return synchronizationFee;
    }

    /**
     * Returns fee required (in native token) to synchronize a single block to btc relay
     *
     * @param feeRate
     */
    public async getFeePerBlock(feeRate?: string): Promise<bigint> {
        feeRate ??= await this.Chain.Fees.getFeeRate();
        return EVMFees.getGasFee(EVMBtcRelay.GasCosts.GAS_PER_BLOCKHEADER, feeRate);
    }

    /**
     * Gets fee rate required for submitting blockheaders to the main chain
     */
    public getMainFeeRate(signer: string | null): Promise<string> {
        return this.Chain.Fees.getFeeRate();
    }

    /**
     * Gets fee rate required for submitting blockheaders to the specific fork
     */
    public getForkFeeRate(signer: string, forkId: number): Promise<string> {
        return this.Chain.Fees.getFeeRate();
    }

    saveInitialHeader(signer: string, header: B, epochStart: number, pastBlocksTimestamps: number[], feeRate?: string): Promise<EVMTx> {
        throw new Error("Not supported, EVM contract is initialized with constructor!");
    }

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
    static async getCommitedHeadersAndSynchronize(
        signer: string,
        btcRelay: EVMBtcRelay<any>,
        btcTxs: {blockheight: number, requiredConfirmations: number, blockhash: string}[],
        txs: EVMTx[],
        synchronizer?: RelaySynchronizer<EVMBtcStoredHeader, EVMTx, any>,
        feeRate?: string
    ): Promise<{
        [blockhash: string]: EVMBtcStoredHeader
    } | null> {
        const leavesTxs: {blockheight: number, requiredConfirmations: number, blockhash: string}[] = [];

        const blockheaders: {
            [blockhash: string]: EVMBtcStoredHeader
        } = {};

        for(let btcTx of btcTxs) {
            const requiredBlockheight = btcTx.blockheight+btcTx.requiredConfirmations-1;

            const result = await tryWithRetries(
                () => btcRelay.retrieveLogAndBlockheight({
                    blockhash: btcTx.blockhash
                }, requiredBlockheight)
            );

            if(result!=null) {
                blockheaders[result.header.getBlockHash().toString("hex")] = result.header;
            } else {
                leavesTxs.push(btcTx);
            }
        }

        if(leavesTxs.length===0) return blockheaders;

        //Need to synchronize
        if(synchronizer==null) return null;

        //TODO: We don't have to synchronize to tip, only to our required blockheight
        const resp = await synchronizer.syncToLatestTxs(signer.toString(), feeRate);
        logger.debug("getCommitedHeaderAndSynchronize(): BTC Relay not synchronized to required blockheight, "+
            "synchronizing ourselves in "+resp.txs.length+" txs");
        logger.debug("getCommitedHeaderAndSynchronize(): BTC Relay computed header map: ",resp.computedHeaderMap);
        txs.push(...resp.txs);

        for(let key in resp.computedHeaderMap) {
            const header = resp.computedHeaderMap[key];
            blockheaders[header.getBlockHash().toString("hex")] = header;
        }

        //Check that blockhashes of all the rest txs are included
        for(let btcTx of leavesTxs) {
            if(blockheaders[btcTx.blockhash]==null) return null;
        }

        //Retrieve computed headers
        return blockheaders;
    }

}
