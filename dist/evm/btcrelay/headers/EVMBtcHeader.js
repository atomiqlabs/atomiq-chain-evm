"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMBtcHeader = void 0;
const buffer_1 = require("buffer");
const sha2_1 = require("@noble/hashes/sha2");
class EVMBtcHeader {
    constructor(data) {
        this.version = data.version;
        this.previousBlockhash = data.previousBlockhash;
        this.merkleRoot = data.merkleRoot;
        this.timestamp = data.timestamp;
        this.nbits = data.nbits;
        this.nonce = data.nonce;
        this.hash = data.hash;
    }
    getMerkleRoot() {
        return this.merkleRoot;
    }
    getNbits() {
        return this.nbits;
    }
    getNonce() {
        return this.nonce;
    }
    getReversedPrevBlockhash() {
        return this.previousBlockhash;
    }
    getTimestamp() {
        return this.timestamp;
    }
    getVersion() {
        return this.version;
    }
    getHash() {
        return buffer_1.Buffer.from((0, sha2_1.sha256)((0, sha2_1.sha256)(this.serialize())));
    }
    serializeCompact() {
        const buffer = buffer_1.Buffer.alloc(48);
        buffer.writeUInt32LE(this.version, 0);
        this.merkleRoot.copy(buffer, 4);
        buffer.writeUInt32LE(this.timestamp, 36);
        buffer.writeUInt32LE(this.nbits, 40);
        buffer.writeUInt32LE(this.nonce, 44);
        return buffer;
    }
    serialize() {
        const buffer = buffer_1.Buffer.alloc(80);
        buffer.writeUInt32LE(this.version, 0);
        this.previousBlockhash.copy(buffer, 4);
        this.merkleRoot.copy(buffer, 36);
        buffer.writeUInt32LE(this.timestamp, 68);
        buffer.writeUInt32LE(this.nbits, 72);
        buffer.writeUInt32LE(this.nonce, 76);
        return buffer;
    }
    static deserialize(rawData) {
        if (rawData.length === 80) {
            //Regular blockheader
            const version = rawData.readUInt32LE(0);
            const previousBlockhash = buffer_1.Buffer.alloc(32);
            rawData.copy(previousBlockhash, 0, 4, 36);
            const merkleRoot = buffer_1.Buffer.alloc(32);
            rawData.copy(merkleRoot, 0, 36, 68);
            const timestamp = rawData.readUInt32LE(68);
            const nbits = rawData.readUInt32LE(72);
            const nonce = rawData.readUInt32LE(76);
            return new EVMBtcHeader({ version, previousBlockhash, merkleRoot, timestamp, nbits, nonce });
        }
        else if (rawData.length === 48) {
            //Compact blockheader
            const version = rawData.readUInt32LE(0);
            const merkleRoot = buffer_1.Buffer.alloc(32);
            rawData.copy(merkleRoot, 0, 4, 36);
            const timestamp = rawData.readUInt32LE(36);
            const nbits = rawData.readUInt32LE(40);
            const nonce = rawData.readUInt32LE(44);
            return new EVMBtcHeader({ version, merkleRoot, timestamp, nbits, nonce });
        }
        else {
            throw new Error("Invalid byte length");
        }
    }
}
exports.EVMBtcHeader = EVMBtcHeader;
