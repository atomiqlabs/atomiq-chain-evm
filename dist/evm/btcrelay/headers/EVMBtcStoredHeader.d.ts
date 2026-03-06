/// <reference types="node" />
/// <reference types="node" />
import { BtcStoredHeader } from "@atomiqlabs/base";
import { EVMBtcHeader, EVMBtcHeaderType } from "./EVMBtcHeader";
import { Buffer } from "buffer";
/**
 * Constructor payload for a stored bitcoin header committed in EVM BTC relay contract state.
 *
 * @category BTC Relay
 */
export type EVMBtcStoredHeaderType = {
    blockheader: EVMBtcHeader | EVMBtcHeaderType;
    blockHash: Buffer;
    chainWork: bigint;
    blockHeight: number;
    lastDiffAdjustment: number;
    prevBlockTimestamps: number[];
};
/**
 * Represents a bitcoin header already committed inside EVM BTC relay contract state.
 *
 * @category BTC Relay
 */
export declare class EVMBtcStoredHeader implements BtcStoredHeader<EVMBtcHeader> {
    private readonly blockheader;
    private readonly blockHash;
    private readonly chainWork;
    private readonly blockHeight;
    private readonly lastDiffAdjustment;
    private readonly prevBlockTimestamps;
    constructor(obj: EVMBtcStoredHeaderType);
    /**
     * @inheritDoc
     */
    getBlockheight(): number;
    /**
     * @inheritDoc
     */
    getChainWork(): Buffer;
    /**
     * @inheritDoc
     */
    getHeader(): EVMBtcHeader;
    /**
     * @inheritDoc
     */
    getLastDiffAdjustment(): number;
    /**
     * @inheritDoc
     */
    getPrevBlockTimestamps(): number[];
    /**
     * @inheritDoc
     */
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
    /**
     * @inheritDoc
     */
    computeNext(header: EVMBtcHeader): EVMBtcStoredHeader;
    /**
     * Returns the commitment of this stored head (keccak256 hash), this is what's actually stored on-chain
     */
    getCommitHash(): string;
    /**
     * Serializes the stored blockheader into the 160-byte binary layout used by the EVM contracts.
     */
    serialize(): Buffer;
    /**
     * Serializes the stored blockheader into the contract tuple form (`bytes32[5]` payload).
     */
    serializeToStruct(): {
        data: [string, string, string, string, string];
    };
    /**
     * Deserializes a stored blockheader from the 160-byte binary representation.
     *
     * @param data Serialized stored blockheader bytes
     */
    static deserialize(data: Buffer): EVMBtcStoredHeader;
}
