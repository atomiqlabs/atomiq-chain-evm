/// <reference types="node" />
/// <reference types="node" />
import { BtcHeader } from "@atomiqlabs/base";
import { Buffer } from "buffer";
/**
 * Constructor payload for EVM bitcoin blockheader representation.
 *
 * @category BTC Relay
 */
export type EVMBtcHeaderType = {
    version: number;
    previousBlockhash?: Buffer;
    merkleRoot: Buffer;
    timestamp: number;
    nbits: number;
    nonce: number;
    hash?: Buffer;
};
/**
 * Representation of a bitcoin blockheader submitted to EVM BTC relay contracts.
 *
 * @category BTC Relay
 */
export declare class EVMBtcHeader implements BtcHeader {
    private readonly version;
    private readonly merkleRoot;
    private readonly timestamp;
    private readonly nbits;
    private readonly nonce;
    private readonly hash?;
    /**
     * @internal
     */
    _previousBlockhash?: Buffer;
    constructor(data: EVMBtcHeaderType);
    /**
     * @inheritDoc
     */
    getMerkleRoot(): Buffer;
    /**
     * @inheritDoc
     */
    getNbits(): number;
    /**
     * @inheritDoc
     */
    getNonce(): number;
    /**
     * @inheritDoc
     */
    getReversedPrevBlockhash(): Buffer;
    /**
     * @inheritDoc
     */
    getTimestamp(): number;
    /**
     * @inheritDoc
     */
    getVersion(): number;
    /**
     * @inheritDoc
     */
    getHash(): Buffer;
    serializeCompact(): Buffer;
    serialize(): Buffer;
    static deserialize(rawData: Buffer): EVMBtcHeader;
}
