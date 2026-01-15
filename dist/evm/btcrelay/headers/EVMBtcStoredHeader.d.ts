/// <reference types="node" />
/// <reference types="node" />
import { BtcStoredHeader } from "@atomiqlabs/base";
import { EVMBtcHeader, EVMBtcHeaderType } from "./EVMBtcHeader";
import { Buffer } from "buffer";
export type StarknetBtcStoredHeaderType = {
    blockheader: EVMBtcHeader | EVMBtcHeaderType;
    blockHash: Buffer;
    chainWork: bigint;
    blockHeight: number;
    lastDiffAdjustment: number;
    prevBlockTimestamps: number[];
};
/**
 * @category BTC Relay
 */
export declare class EVMBtcStoredHeader implements BtcStoredHeader<EVMBtcHeader> {
    blockheader: EVMBtcHeader;
    blockHash: Buffer;
    chainWork: bigint;
    blockHeight: number;
    lastDiffAdjustment: number;
    prevBlockTimestamps: number[];
    constructor(obj: StarknetBtcStoredHeaderType);
    getBlockheight(): number;
    getChainWork(): Buffer;
    getHeader(): EVMBtcHeader;
    getLastDiffAdjustment(): number;
    getPrevBlockTimestamps(): number[];
    getBlockHash(): Buffer;
    /**
     * Computes prevBlockTimestamps for a next block, shifting the old block timestamps to the left & appending
     *  this block's timestamp to the end
     *
     * @private
     */
    private computeNextBlockTimestamps;
    /**
     * Computes total chain work after a new header with "nbits" is added to the chain
     *
     * @param nbits
     * @private
     */
    private computeNextChainWork;
    /**
     * Computes lastDiffAdjustment, this changes only once every DIFF_ADJUSTMENT_PERIOD blocks
     *
     * @param headerTimestamp
     * @private
     */
    private computeNextLastDiffAdjustment;
    computeNext(header: EVMBtcHeader): EVMBtcStoredHeader;
    getCommitHash(): string;
    serialize(): Buffer;
    serializeToStruct(): {
        data: [string, string, string, string, string];
    };
    static deserialize(data: Buffer): EVMBtcStoredHeader;
}
