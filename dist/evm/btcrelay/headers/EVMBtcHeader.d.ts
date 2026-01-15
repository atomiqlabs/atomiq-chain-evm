/// <reference types="node" />
/// <reference types="node" />
import { BtcHeader } from "@atomiqlabs/base";
import { Buffer } from "buffer";
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
    getMerkleRoot(): Buffer;
    getNbits(): number;
    getNonce(): number;
    getReversedPrevBlockhash(): Buffer;
    getTimestamp(): number;
    getVersion(): number;
    getHash(): Buffer;
    serializeCompact(): Buffer;
    serialize(): Buffer;
    static deserialize(rawData: Buffer): EVMBtcHeader;
}
