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
    version: number;
    previousBlockhash?: Buffer;
    merkleRoot: Buffer;
    timestamp: number;
    nbits: number;
    nonce: number;
    hash?: Buffer;
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
