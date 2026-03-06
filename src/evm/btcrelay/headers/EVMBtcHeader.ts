import {BtcHeader} from "@atomiqlabs/base";
import {Buffer} from "buffer";
import {sha256} from "@noble/hashes/sha2";

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
export class EVMBtcHeader implements BtcHeader {

    private readonly version: number;
    private readonly merkleRoot: Buffer;
    private readonly timestamp: number;
    private readonly nbits: number;
    private readonly nonce: number;
    private readonly hash?: Buffer;

    /**
     * @internal
     */
    _previousBlockhash?: Buffer;

    constructor(data: EVMBtcHeaderType) {
        this.version = data.version;
        this._previousBlockhash = data.previousBlockhash;
        this.merkleRoot = data.merkleRoot;
        this.timestamp = data.timestamp;
        this.nbits = data.nbits;
        this.nonce = data.nonce;
        this.hash = data.hash;
    }

    /**
     * @inheritDoc
     */
    getMerkleRoot(): Buffer {
        return this.merkleRoot;
    }

    /**
     * @inheritDoc
     */
    getNbits(): number {
        return this.nbits;
    }

    /**
     * @inheritDoc
     */
    getNonce(): number {
        return this.nonce;
    }

    /**
     * @inheritDoc
     */
    getReversedPrevBlockhash(): Buffer {
        if(this._previousBlockhash==null) throw new Error("Previous blockhash is not known from compact blockheader!");
        return this._previousBlockhash;
    }

    /**
     * @inheritDoc
     */
    getTimestamp(): number {
        return this.timestamp;
    }

    /**
     * @inheritDoc
     */
    getVersion(): number {
        return this.version;
    }

    /**
     * @inheritDoc
     */
    getHash(): Buffer {
        return Buffer.from(sha256(sha256(this.serialize())));
    }

    /**
     * Serializes the bitcoin blockheader into compact 48-byte representation
     * (without previous blockhash).
     */
    serializeCompact(): Buffer {
        const buffer = Buffer.alloc(48);
        buffer.writeUInt32LE(this.version, 0);
        this.merkleRoot.copy(buffer, 4);
        buffer.writeUInt32LE(this.timestamp, 36);
        buffer.writeUInt32LE(this.nbits, 40);
        buffer.writeUInt32LE(this.nonce, 44);
        return buffer;
    }

    /**
     * Serializes the bitcoin blockheader into full 80-byte representation.
     */
    serialize(): Buffer {
        if(this._previousBlockhash==null) throw new Error("Cannot serialize compact blockheader without previous blockhash!");
        const buffer = Buffer.alloc(80);
        buffer.writeUInt32LE(this.version, 0);
        this._previousBlockhash.copy(buffer, 4);
        this.merkleRoot.copy(buffer, 36);
        buffer.writeUInt32LE(this.timestamp, 68);
        buffer.writeUInt32LE(this.nbits, 72);
        buffer.writeUInt32LE(this.nonce, 76);
        return buffer;
    }

    /**
     * Deserializes a bitcoin blockheader from 80-byte full or 48-byte compact representation.
     *
     * @param rawData Serialized blockheader bytes
     */
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
