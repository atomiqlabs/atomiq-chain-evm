import {BtcHeader} from "@atomiqlabs/base";
import {Buffer} from "buffer";
import {sha256} from "@noble/hashes/sha2";

export type EVMBtcHeaderType = {
    version: number;
    previousBlockhash?: Buffer;
    merkleRoot: Buffer;
    timestamp: number;
    nbits: number;
    nonce: number;
    hash?: Buffer;
};

export class EVMBtcHeader implements BtcHeader {

    version: number;
    previousBlockhash: Buffer;
    merkleRoot: Buffer;
    timestamp: number;
    nbits: number;
    nonce: number;
    hash?: Buffer;

    constructor(data: EVMBtcHeaderType) {
        this.version = data.version;
        this.previousBlockhash = data.previousBlockhash;
        this.merkleRoot = data.merkleRoot;
        this.timestamp = data.timestamp;
        this.nbits = data.nbits;
        this.nonce = data.nonce;
        this.hash = data.hash;
    }

    getMerkleRoot(): Buffer {
        return this.merkleRoot;
    }

    getNbits(): number {
        return this.nbits;
    }

    getNonce(): number {
        return this.nonce;
    }

    getReversedPrevBlockhash(): Buffer {
        return this.previousBlockhash;
    }

    getTimestamp(): number {
        return this.timestamp;
    }

    getVersion(): number {
        return this.version;
    }

    getHash(): Buffer {
        return Buffer.from(sha256(sha256(this.serialize())));
    }

    serializeCompact(): Buffer {
        const buffer = Buffer.alloc(48);
        buffer.writeUInt32LE(this.version, 0);
        this.merkleRoot.copy(buffer, 4);
        buffer.writeUInt32LE(this.timestamp, 36);
        buffer.writeUInt32LE(this.nbits, 40);
        buffer.writeUInt32LE(this.nonce, 44);
        return buffer;
    }

    serialize(): Buffer {
        const buffer = Buffer.alloc(80);
        buffer.writeUInt32LE(this.version, 0);
        this.previousBlockhash.copy(buffer, 4);
        this.merkleRoot.copy(buffer, 36);
        buffer.writeUInt32LE(this.timestamp, 68);
        buffer.writeUInt32LE(this.nbits, 72);
        buffer.writeUInt32LE(this.nonce, 76);
        return buffer;
    }

    static deserialize(rawData: Buffer): EVMBtcHeader {
        if(rawData.length===80) {
            //Regular blockheader
            const version = rawData.readUInt32LE(0);
            const previousBlockhash = Buffer.alloc(32);
            rawData.copy(previousBlockhash, 0, 4, 36);
            const merkleRoot = Buffer.alloc(32);
            rawData.copy(merkleRoot, 0, 36, 68);
            const timestamp = rawData.readUInt32LE(68);
            const nbits = rawData.readUInt32LE(72);
            const nonce = rawData.readUInt32LE(76);
            return new EVMBtcHeader({version, previousBlockhash, merkleRoot, timestamp, nbits, nonce});
        } else if(rawData.length===48) {
            //Compact blockheader
            const version = rawData.readUInt32LE(0);
            const merkleRoot = Buffer.alloc(32);
            rawData.copy(merkleRoot, 0, 4, 36);
            const timestamp = rawData.readUInt32LE(36);
            const nbits = rawData.readUInt32LE(40);
            const nonce = rawData.readUInt32LE(44);
            return new EVMBtcHeader({version, merkleRoot, timestamp, nbits, nonce});
        } else {
            throw new Error("Invalid byte length");
        }
    }

}