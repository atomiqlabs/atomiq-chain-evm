"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMBtcRelay = void 0;
const base_1 = require("@atomiqlabs/base");
const EVMBtcHeader_1 = require("./headers/EVMBtcHeader");
const Utils_1 = require("../../utils/Utils");
const EVMContractBase_1 = require("../contract/EVMContractBase");
const EVMBtcStoredHeader_1 = require("./headers/EVMBtcStoredHeader");
const EVMFees_1 = require("../chain/modules/EVMFees");
const BtcRelayAbi_1 = require("./BtcRelayAbi");
const ethers_1 = require("ethers");
function serializeBlockHeader(e) {
    return new EVMBtcHeader_1.EVMBtcHeader({
        version: e.getVersion(),
        previousBlockhash: Buffer.from(e.getPrevBlockhash(), "hex").reverse(),
        merkleRoot: Buffer.from(e.getMerkleRoot(), "hex").reverse(),
        timestamp: e.getTimestamp(),
        nbits: e.getNbits(),
        nonce: e.getNonce(),
        hash: Buffer.from(e.getHash(), "hex").reverse()
    });
}
const GAS_PER_BLOCKHEADER = 30000;
const GAS_BASE_MAIN = 7500;
const GAS_PER_BLOCKHEADER_FORK = 65000;
const GAS_PER_BLOCKHEADER_FORKED = 10000;
const GAS_BASE_FORK = 25000;
const logger = (0, Utils_1.getLogger)("EVMBtcRelay: ");
class EVMBtcRelay extends EVMContractBase_1.EVMContractBase {
    async SaveMainHeaders(signer, mainHeaders, storedHeader, feeRate) {
        const tx = await this.contract.submitMainBlockheaders.populateTransaction(Buffer.concat([
            storedHeader.serialize(),
            Buffer.concat(mainHeaders.map(header => header.serializeCompact()))
        ]));
        tx.from = signer;
        EVMFees_1.EVMFees.applyFeeRate(tx, GAS_BASE_MAIN + (GAS_PER_BLOCKHEADER * mainHeaders.length), feeRate);
        return tx;
    }
    async SaveShortForkHeaders(signer, forkHeaders, storedHeader, feeRate) {
        const tx = await this.contract.submitShortForkBlockheaders.populateTransaction(Buffer.concat([
            storedHeader.serialize(),
            Buffer.concat(forkHeaders.map(header => header.serializeCompact()))
        ]));
        tx.from = signer;
        EVMFees_1.EVMFees.applyFeeRate(tx, GAS_BASE_MAIN + (GAS_PER_BLOCKHEADER * forkHeaders.length), feeRate);
        return tx;
    }
    async SaveLongForkHeaders(signer, forkId, forkHeaders, storedHeader, feeRate, totalForkHeaders = 100) {
        const tx = await this.contract.submitForkBlockheaders.populateTransaction(forkId, Buffer.concat([
            storedHeader.serialize(),
            Buffer.concat(forkHeaders.map(header => header.serializeCompact()))
        ]));
        tx.from = signer;
        EVMFees_1.EVMFees.applyFeeRate(tx, GAS_BASE_FORK + (GAS_PER_BLOCKHEADER_FORK * forkHeaders.length) + (GAS_PER_BLOCKHEADER_FORKED * totalForkHeaders), feeRate);
        return tx;
    }
    constructor(chainInterface, bitcoinRpc, bitcoinNetwork, contractAddress) {
        super(chainInterface, contractAddress, BtcRelayAbi_1.BtcRelayAbi);
        this.maxHeadersPerTx = 100;
        this.maxForkHeadersPerTx = 50;
        this.maxShortForkHeadersPerTx = 100;
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
    computeCommitedHeaders(initialStoredHeader, syncedHeaders) {
        const computedCommitedHeaders = [initialStoredHeader];
        for (let blockHeader of syncedHeaders) {
            computedCommitedHeaders.push(computedCommitedHeaders[computedCommitedHeaders.length - 1].computeNext(blockHeader));
        }
        return computedCommitedHeaders;
    }
    /**
     * A common logic for submitting blockheaders in a transaction
     *
     * @param signer
     * @param headers headers to sync to the btc relay
     * @param storedHeader current latest stored block header for a given fork
     * @param tipWork work of the current tip in a given fork
     * @param forkId forkId to submit to, forkId=0 means main chain, forkId=-1 means short fork
     * @param feeRate feeRate for the transaction
     * @param totalForkHeaders Total number of headers in a fork
     * @private
     */
    async _saveHeaders(signer, headers, storedHeader, tipWork, forkId, feeRate, totalForkHeaders) {
        const blockHeaderObj = headers.map(serializeBlockHeader);
        let tx;
        switch (forkId) {
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
        const lastStoredHeader = computedCommitedHeaders[computedCommitedHeaders.length - 1];
        if (forkId !== 0 && base_1.StatePredictorUtils.gtBuffer(lastStoredHeader.getBlockHash(), tipWork)) {
            //Fork's work is higher than main chain's work, this fork will become a main chain
            forkId = 0;
        }
        return {
            forkId: forkId,
            lastStoredHeader,
            tx,
            computedCommitedHeaders
        };
    }
    async findStoredBlockheaderInTraces(txTrace, commitHash) {
        if (txTrace.to.toLowerCase() === (await this.contract.getAddress()).toLowerCase()) {
            let dataBuffer;
            if (txTrace.type === "CREATE") {
                dataBuffer = Buffer.from(txTrace.input.substring(txTrace.input.length - 384, txTrace.input.length - 64), "hex");
            }
            else {
                const result = this.parseCalldata(txTrace.input);
                if (result != null) {
                    if (result.name === "submitMainBlockheaders" || result.name === "submitShortForkBlockheaders") {
                        const functionCall = result;
                        dataBuffer = Buffer.from((0, ethers_1.hexlify)(functionCall.args[0]).substring(2), "hex");
                    }
                    else if (result.name === "submitForkBlockheaders") {
                        const functionCall = result;
                        dataBuffer = Buffer.from((0, ethers_1.hexlify)(functionCall.args[1]).substring(2), "hex");
                    }
                }
            }
            if (dataBuffer != null) {
                let storedHeader = EVMBtcStoredHeader_1.EVMBtcStoredHeader.deserialize(dataBuffer.subarray(0, 160));
                if (storedHeader.getCommitHash() === commitHash)
                    return storedHeader;
                for (let i = 160; i < dataBuffer.length; i += 48) {
                    const blockHeader = EVMBtcHeader_1.EVMBtcHeader.deserialize(dataBuffer.subarray(i, i + 48));
                    storedHeader = storedHeader.computeNext(blockHeader);
                    if (storedHeader.getCommitHash() === commitHash)
                        return storedHeader;
                }
            }
        }
        if (txTrace.calls != null) {
            for (let call of txTrace.calls) {
                const result = await this.findStoredBlockheaderInTraces(call, commitHash);
                if (result != null)
                    return result;
            }
        }
        return null;
    }
    getBlock(commitHash, blockHash) {
        return this.Events.findInContractEvents(["StoreHeader", "StoreForkHeader"], [
            commitHash,
            blockHash == null ? null : "0x" + blockHash.toString("hex")
        ], async (event) => {
            const txTrace = await this.Chain.Transactions.traceTransaction(event.transactionHash);
            const storedBlockheader = await this.findStoredBlockheaderInTraces(txTrace, event.args.commitHash);
            if (storedBlockheader != null)
                return [storedBlockheader, event.args.commitHash];
        });
    }
    async getBlockHeight() {
        return Number(await this.contract.getBlockheight());
    }
    /**
     * Returns data about current main chain tip stored in the btc relay
     */
    async getTipData() {
        const commitHash = await this.contract.getTipCommitHash();
        if (commitHash == null || BigInt(commitHash) === BigInt(0))
            return null;
        const result = await this.getBlock(commitHash);
        if (result == null)
            return null;
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
    async retrieveLogAndBlockheight(blockData, requiredBlockheight) {
        //TODO: we can fetch the blockheight and events in parallel
        const blockHeight = await this.getBlockHeight();
        if (requiredBlockheight != null && blockHeight < requiredBlockheight) {
            return null;
        }
        const result = await this.getBlock(null, Buffer.from(blockData.blockhash, "hex"));
        if (result == null)
            return null;
        const [storedBlockHeader, commitHash] = result;
        //Check if block is part of the main chain
        const chainCommitment = await this.contract.getCommitHash(storedBlockHeader.blockHeight);
        if (chainCommitment !== commitHash)
            return null;
        logger.debug("retrieveLogAndBlockheight(): block found," +
            " commit hash: " + commitHash + " blockhash: " + blockData.blockhash + " current btc relay height: " + blockHeight);
        return { header: storedBlockHeader, height: blockHeight };
    }
    /**
     * Retrieves blockheader data by blockheader's commit hash,
     *
     * @param commitmentHashStr
     * @param blockData
     */
    async retrieveLogByCommitHash(commitmentHashStr, blockData) {
        const result = await this.getBlock(commitmentHashStr, Buffer.from(blockData.blockhash, "hex"));
        if (result == null)
            return null;
        const [storedBlockHeader, commitHash] = result;
        //Check if block is part of the main chain
        const chainCommitment = await this.contract.getCommitHash(storedBlockHeader.blockHeight);
        if (chainCommitment !== commitHash)
            return null;
        logger.debug("retrieveLogByCommitHash(): block found," +
            " commit hash: " + commitmentHashStr + " blockhash: " + blockData.blockhash + " height: " + storedBlockHeader.blockHeight);
        return storedBlockHeader;
    }
    /**
     * Retrieves latest known stored blockheader & blockheader from bitcoin RPC that is in the main chain
     */
    async retrieveLatestKnownBlockLog() {
        const data = await this.Events.findInContractEvents(["StoreHeader", "StoreForkHeader"], null, async (event) => {
            const blockHashHex = Buffer.from(event.args.blockHash.substring(2), "hex").reverse().toString("hex");
            const commitHash = event.args.commitHash;
            const isInBtcMainChain = await this.bitcoinRpc.isInMainChain(blockHashHex).catch(() => false);
            if (!isInBtcMainChain)
                return null;
            const blockHeader = await this.bitcoinRpc.getBlockHeader(blockHashHex);
            if (commitHash !== await this.contract.getCommitHash(blockHeader.getHeight()))
                return null;
            const txTrace = await this.Chain.Transactions.traceTransaction(event.transactionHash);
            const storedHeader = await this.findStoredBlockheaderInTraces(txTrace, commitHash);
            if (storedHeader == null)
                return null;
            return {
                resultStoredHeader: storedHeader,
                resultBitcoinHeader: blockHeader,
                commitHash: commitHash
            };
        });
        if (data != null)
            logger.debug("retrieveLatestKnownBlockLog(): block found," +
                " commit hash: " + data.commitHash + " blockhash: " + data.resultBitcoinHeader.getHash() +
                " height: " + data.resultStoredHeader.getBlockheight());
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
    async saveMainHeaders(signer, mainHeaders, storedHeader, feeRate) {
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        logger.debug("saveMainHeaders(): submitting main blockheaders, count: " + mainHeaders.length);
        return this._saveHeaders(signer, mainHeaders, storedHeader, null, 0, feeRate, 0);
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
    async saveNewForkHeaders(signer, forkHeaders, storedHeader, tipWork, feeRate) {
        let forkId = Math.floor(Math.random() * 0xFFFFFFFFFFFF);
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        logger.debug("saveNewForkHeaders(): submitting new fork & blockheaders," +
            " count: " + forkHeaders.length + " forkId: 0x" + forkId.toString(16));
        return await this._saveHeaders(signer, forkHeaders, storedHeader, tipWork, forkId, feeRate, forkHeaders.length);
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
    async saveForkHeaders(signer, forkHeaders, storedHeader, forkId, tipWork, feeRate) {
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        logger.debug("saveForkHeaders(): submitting blockheaders to existing fork," +
            " count: " + forkHeaders.length + " forkId: 0x" + forkId.toString(16));
        return this._saveHeaders(signer, forkHeaders, storedHeader, tipWork, forkId, feeRate, 100);
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
    async saveShortForkHeaders(signer, forkHeaders, storedHeader, tipWork, feeRate) {
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        logger.debug("saveShortForkHeaders(): submitting short fork blockheaders," +
            " count: " + forkHeaders.length);
        return this._saveHeaders(signer, forkHeaders, storedHeader, tipWork, -1, feeRate, 0);
    }
    /**
     * Estimate required synchronization fee (worst case) to synchronize btc relay to the required blockheight
     *
     * @param requiredBlockheight
     * @param feeRate
     */
    async estimateSynchronizeFee(requiredBlockheight, feeRate) {
        const tipData = await this.getTipData();
        const currBlockheight = tipData.blockheight;
        const blockheightDelta = requiredBlockheight - currBlockheight;
        if (blockheightDelta <= 0)
            return 0n;
        const synchronizationFee = BigInt(blockheightDelta) * await this.getFeePerBlock(feeRate);
        logger.debug("estimateSynchronizeFee(): required blockheight: " + requiredBlockheight +
            " blockheight delta: " + blockheightDelta + " fee: " + synchronizationFee.toString(10));
        return synchronizationFee;
    }
    /**
     * Returns fee required (in SOL) to synchronize a single block to btc relay
     *
     * @param feeRate
     */
    async getFeePerBlock(feeRate) {
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        return EVMFees_1.EVMFees.getGasFee(GAS_PER_BLOCKHEADER, feeRate);
    }
    /**
     * Gets fee rate required for submitting blockheaders to the main chain
     */
    getMainFeeRate(signer) {
        return this.Chain.Fees.getFeeRate();
    }
    /**
     * Gets fee rate required for submitting blockheaders to the specific fork
     */
    getForkFeeRate(signer, forkId) {
        return this.Chain.Fees.getFeeRate();
    }
    saveInitialHeader(signer, header, epochStart, pastBlocksTimestamps, feeRate) {
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
    static async getCommitedHeadersAndSynchronize(signer, btcRelay, btcTxs, txs, synchronizer, feeRate) {
        const leavesTxs = [];
        const blockheaders = {};
        for (let btcTx of btcTxs) {
            const requiredBlockheight = btcTx.blockheight + btcTx.requiredConfirmations - 1;
            const result = await (0, Utils_1.tryWithRetries)(() => btcRelay.retrieveLogAndBlockheight({
                blockhash: btcTx.blockhash
            }, requiredBlockheight));
            if (result != null) {
                blockheaders[result.header.getBlockHash().toString("hex")] = result.header;
            }
            else {
                leavesTxs.push(btcTx);
            }
        }
        if (leavesTxs.length === 0)
            return blockheaders;
        //Need to synchronize
        if (synchronizer == null)
            return null;
        //TODO: We don't have to synchronize to tip, only to our required blockheight
        const resp = await synchronizer.syncToLatestTxs(signer.toString(), feeRate);
        logger.debug("getCommitedHeaderAndSynchronize(): BTC Relay not synchronized to required blockheight, " +
            "synchronizing ourselves in " + resp.txs.length + " txs");
        logger.debug("getCommitedHeaderAndSynchronize(): BTC Relay computed header map: ", resp.computedHeaderMap);
        txs.push(...resp.txs);
        for (let key in resp.computedHeaderMap) {
            const header = resp.computedHeaderMap[key];
            blockheaders[header.getBlockHash().toString("hex")] = header;
        }
        //Check that blockhashes of all the rest txs are included
        for (let btcTx of leavesTxs) {
            if (blockheaders[btcTx.blockhash] == null)
                return null;
        }
        //Retrieve computed headers
        return blockheaders;
    }
}
exports.EVMBtcRelay = EVMBtcRelay;
