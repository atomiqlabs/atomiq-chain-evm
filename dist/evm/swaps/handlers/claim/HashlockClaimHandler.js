"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashlockClaimHandler = void 0;
const base_1 = require("@atomiqlabs/base");
const buffer_1 = require("buffer");
const ethers_1 = require("ethers");
const sha2_1 = require("@noble/hashes/sha2");
/**
 * @category Handlers
 */
class HashlockClaimHandler {
    constructor(address) {
        this.address = address;
    }
    getCommitment(data) {
        if (data.length !== 32)
            throw new Error("Invalid swap hash");
        return (0, ethers_1.hexlify)(data);
    }
    getWitness(signer, data, witnessData) {
        if (!data.isClaimHandler(this.address))
            throw new Error("Invalid claim handler");
        if (witnessData.length !== 64)
            throw new Error("Invalid hash secret: string length");
        const buffer = buffer_1.Buffer.from(witnessData, "hex");
        if (buffer.length !== 32)
            throw new Error("Invalid hash secret: buff length");
        const witnessSha256 = buffer_1.Buffer.from((0, sha2_1.sha256)(buffer));
        if (!data.isClaimData(this.getCommitment(witnessSha256)))
            throw new Error("Invalid hash secret: poseidon hash doesn't match");
        return Promise.resolve({ initialTxns: [], witness: buffer });
    }
    getGas() {
        return HashlockClaimHandler.gas;
    }
    getType() {
        return HashlockClaimHandler.type;
    }
}
exports.HashlockClaimHandler = HashlockClaimHandler;
HashlockClaimHandler.type = base_1.ChainSwapType.HTLC;
HashlockClaimHandler.gas = 5000;
