"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMBtcStoredHeader = void 0;
const base_1 = require("@atomiqlabs/base");
const EVMBtcHeader_1 = require("./EVMBtcHeader");
const buffer_1 = require("buffer");
const ethers_1 = require("ethers");
class EVMBtcStoredHeader {
    constructor(obj) {
        this.blockheader = obj.blockheader instanceof EVMBtcHeader_1.EVMBtcHeader ? obj.blockheader : new EVMBtcHeader_1.EVMBtcHeader(obj.blockheader);
        this.blockHash = obj.blockHash;
        this.chainWork = obj.chainWork;
        this.blockHeight = obj.blockHeight;
        this.lastDiffAdjustment = obj.lastDiffAdjustment;
        this.prevBlockTimestamps = obj.prevBlockTimestamps;
    }
    getBlockheight() {
        return this.blockHeight;
    }
    getChainWork() {
        return buffer_1.Buffer.from(this.chainWork.toString(16).padStart(64, "0"), "hex");
    }
    getHeader() {
        return this.blockheader;
    }
    getLastDiffAdjustment() {
        return this.lastDiffAdjustment;
    }
    getPrevBlockTimestamps() {
        return this.prevBlockTimestamps;
    }
    getBlockHash() {
        return buffer_1.Buffer.from([...this.blockHash]).reverse();
    }
    /**
     * Computes prevBlockTimestamps for a next block, shifting the old block timestamps to the left & appending
     *  this block's timestamp to the end
     *
     * @private
     */
    computeNextBlockTimestamps() {
        const prevBlockTimestamps = [...this.prevBlockTimestamps];
        for (let i = 1; i < 10; i++) {
            prevBlockTimestamps[i - 1] = prevBlockTimestamps[i];
        }
        prevBlockTimestamps[9] = this.blockheader.getTimestamp();
        return prevBlockTimestamps;
    }
    /**
     * Computes total chain work after a new header with "nbits" is added to the chain
     *
     * @param nbits
     * @private
     */
    computeNextChainWork(nbits) {
        return this.chainWork + base_1.BigIntBufferUtils.fromBuffer(base_1.StatePredictorUtils.getChainwork(nbits));
    }
    /**
     * Computes lastDiffAdjustment, this changes only once every DIFF_ADJUSTMENT_PERIOD blocks
     *
     * @param headerTimestamp
     * @private
     */
    computeNextLastDiffAdjustment(headerTimestamp) {
        const blockheight = this.blockHeight + 1;
        let lastDiffAdjustment = this.lastDiffAdjustment;
        if (blockheight % base_1.StatePredictorUtils.DIFF_ADJUSTMENT_PERIOD === 0) {
            lastDiffAdjustment = headerTimestamp;
        }
        return lastDiffAdjustment;
    }
    computeNext(header) {
        header.previousBlockhash = this.blockHash;
        return new EVMBtcStoredHeader({
            chainWork: this.computeNextChainWork(header.getNbits()),
            prevBlockTimestamps: this.computeNextBlockTimestamps(),
            blockHeight: this.blockHeight + 1,
            lastDiffAdjustment: this.computeNextLastDiffAdjustment(header.getTimestamp()),
            blockHash: header.getHash(),
            blockheader: header
        });
    }
    getCommitHash() {
        return (0, ethers_1.keccak256)(this.serialize());
    }
    serialize() {
        const buffer = buffer_1.Buffer.alloc(160);
        this.blockheader.serialize().copy(buffer, 0, 0, 80);
        base_1.BigIntBufferUtils.toBuffer(this.chainWork, "be", 32).copy(buffer, 80, 0, 32);
        buffer.writeUint32BE(this.blockHeight, 112);
        buffer.writeUint32BE(this.lastDiffAdjustment, 116);
        for (let i = 0; i < 10; i++) {
            buffer.writeUint32BE(this.prevBlockTimestamps[i], 120 + (i * 4));
        }
        return buffer;
    }
    serializeToStruct() {
        const buffer = this.serialize();
        const result = [];
        for (let i = 0; i < 5; i++) {
            result[i] = "0x" + buffer.subarray(i * 32, (i + 1) * 32).toString("hex");
        }
        return { data: result };
    }
    static deserialize(data) {
        if (data.length !== 160)
            throw new Error(`Invalid size Expected 160, got: ${data.length}!`);
        const blockheader = EVMBtcHeader_1.EVMBtcHeader.deserialize(data.subarray(0, 80));
        const prevBlockTimestamps = [];
        for (let i = 0; i < 10; i++) {
            prevBlockTimestamps[i] = data.readUint32BE(120 + (i * 4));
        }
        return new EVMBtcStoredHeader({
            blockheader,
            blockHash: blockheader.getHash(),
            chainWork: base_1.BigIntBufferUtils.fromBuffer(data.subarray(80, 112)),
            blockHeight: data.readUint32BE(112),
            lastDiffAdjustment: data.readUint32BE(116),
            prevBlockTimestamps
        });
    }
}
exports.EVMBtcStoredHeader = EVMBtcStoredHeader;
