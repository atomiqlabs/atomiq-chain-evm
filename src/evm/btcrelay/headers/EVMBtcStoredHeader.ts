import {BigIntBufferUtils, BtcStoredHeader, StatePredictorUtils} from "@atomiqlabs/base";
import {EVMBtcHeader, EVMBtcHeaderType} from "./EVMBtcHeader";
import {Buffer} from "buffer";
import {keccak256} from "ethers";

export type StarknetBtcStoredHeaderType = {
    blockheader: EVMBtcHeader | EVMBtcHeaderType,
    blockHash: Buffer,
    chainWork: bigint,
    blockHeight: number,
    lastDiffAdjustment: number,
    prevBlockTimestamps: number[]
}

export class EVMBtcStoredHeader implements BtcStoredHeader<EVMBtcHeader> {

    blockheader: EVMBtcHeader;
    blockHash: Buffer;
    chainWork: bigint;
    blockHeight: number;
    lastDiffAdjustment: number;
    prevBlockTimestamps: number[];

    constructor(obj: StarknetBtcStoredHeaderType) {
        this.blockheader = obj.blockheader instanceof EVMBtcHeader ? obj.blockheader : new EVMBtcHeader(obj.blockheader);
        this.blockHash = obj.blockHash;
        this.chainWork = obj.chainWork;
        this.blockHeight = obj.blockHeight;
        this.lastDiffAdjustment = obj.lastDiffAdjustment;
        this.prevBlockTimestamps = obj.prevBlockTimestamps;
    }

    getBlockheight(): number {
        return this.blockHeight;
    }

    getChainWork(): Buffer {
        return Buffer.from(this.chainWork.toString(16).padStart(64, "0"), "hex");
    }

    getHeader(): EVMBtcHeader {
        return this.blockheader;
    }

    getLastDiffAdjustment(): number {
        return this.lastDiffAdjustment;
    }

    getPrevBlockTimestamps(): number[] {
        return this.prevBlockTimestamps;
    }

    getBlockHash(): Buffer {
        return Buffer.from([...this.blockHash]).reverse();
    }

    /**
     * Computes prevBlockTimestamps for a next block, shifting the old block timestamps to the left & appending
     *  this block's timestamp to the end
     *
     * @private
     */
    private computeNextBlockTimestamps(): number[] {
        const prevBlockTimestamps = [...this.prevBlockTimestamps];
        for(let i=1;i<10;i++) {
            prevBlockTimestamps[i-1] = prevBlockTimestamps[i];
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
    private computeNextChainWork(nbits: number): bigint {
        return this.chainWork + BigIntBufferUtils.fromBuffer(StatePredictorUtils.getChainwork(nbits));
    }

    /**
     * Computes lastDiffAdjustment, this changes only once every DIFF_ADJUSTMENT_PERIOD blocks
     *
     * @param headerTimestamp
     * @private
     */
    private computeNextLastDiffAdjustment(headerTimestamp: number) {
        const blockheight = this.blockHeight+1;

        let lastDiffAdjustment = this.lastDiffAdjustment;
        if(blockheight % StatePredictorUtils.DIFF_ADJUSTMENT_PERIOD === 0) {
            lastDiffAdjustment = headerTimestamp;
        }

        return lastDiffAdjustment;
    }

    computeNext(header: EVMBtcHeader): EVMBtcStoredHeader {
        header.previousBlockhash = this.blockHash;
        return new EVMBtcStoredHeader({
            chainWork: this.computeNextChainWork(header.getNbits()),
            prevBlockTimestamps: this.computeNextBlockTimestamps(),
            blockHeight: this.blockHeight+1,
            lastDiffAdjustment: this.computeNextLastDiffAdjustment(header.getTimestamp()),
            blockHash: header.getHash(),
            blockheader: header
        });
    }

    getCommitHash(): string {
        return keccak256(this.serialize());
    }

    serialize(): Buffer {
        const buffer = Buffer.alloc(160);
        this.blockheader.serialize().copy(buffer, 0, 0, 80);
        BigIntBufferUtils.toBuffer(this.chainWork).copy(buffer, 80, 0, 32);
        buffer.writeUint32BE(this.blockHeight, 112);
        buffer.writeUint32BE(this.lastDiffAdjustment, 116);
        for(let i=0;i<10;i++) {
            buffer.writeUint32BE(this.prevBlockTimestamps[i], 120 + (i*4));
        }
        return buffer;
    }

    serializeToStruct(): {data: [string, string, string, string, string]} {
        const buffer = this.serialize();
        const result: string[] = [];
        for(let i=0;i<5;i++) {
            result[i] = "0x"+buffer.subarray(i*32, (i+1)*32).toString("hex");
        }
        return {data: result as any};
    }

    static deserialize(data: Buffer): EVMBtcStoredHeader {
        if(data.length!==160) throw new Error(`Invalid size Expected 160, got: ${data.length}!`);
        const blockheader = EVMBtcHeader.deserialize(data.subarray(0, 80));
        const prevBlockTimestamps: number[] = [];
        for(let i=0;i<10;i++) {
            prevBlockTimestamps[i] = data.readUint32BE(120 + (i*4));
        }
        return new EVMBtcStoredHeader({
            blockheader,
            blockHash: blockheader.getHash(),
            chainWork: BigIntBufferUtils.fromBuffer(data.subarray(80, 112)),
            blockHeight: data.readUint32BE(112),
            lastDiffAdjustment: data.readUint32BE(116),
            prevBlockTimestamps
        });
    }

}