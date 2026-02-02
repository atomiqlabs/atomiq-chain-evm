"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitcoinOutputClaimHandler = void 0;
const base_1 = require("@atomiqlabs/base");
const IBitcoinClaimHandler_1 = require("./IBitcoinClaimHandler");
const buffer_1 = require("buffer");
const ethers_1 = require("ethers");
const btc_signer_1 = require("@scure/btc-signer");
/**
 * @category Internal/Handlers
 */
class BitcoinOutputClaimHandler extends IBitcoinClaimHandler_1.IBitcoinClaimHandler {
    serializeCommitment(data) {
        const txoHash = (0, ethers_1.solidityPackedKeccak256)(["uint64", "bytes32"], [data.amount, (0, ethers_1.keccak256)(data.output)]);
        return buffer_1.Buffer.concat([
            buffer_1.Buffer.from(txoHash.substring(2), "hex"),
            super.serializeCommitment(data)
        ]);
    }
    async getWitness(signer, swapData, witnessData, feeRate) {
        if (!swapData.isClaimHandler(this.address))
            throw new Error("Invalid claim handler");
        const txBuffer = buffer_1.Buffer.from(witnessData.tx.hex, "hex");
        const parsedBtcTx = btc_signer_1.Transaction.fromRaw(txBuffer);
        const out = parsedBtcTx.getOutput(witnessData.vout);
        const { initialTxns, commitment, blockheader, merkleProof } = await this._getWitness(signer, swapData, witnessData, {
            output: buffer_1.Buffer.from(out.script),
            amount: out.amount
        });
        const voutAndTxData = buffer_1.Buffer.concat([
            base_1.BigIntBufferUtils.toBuffer(BigInt(witnessData.vout), "be", 4),
            base_1.BigIntBufferUtils.toBuffer(BigInt(txBuffer.length), "be", 32),
            txBuffer
        ]);
        return {
            initialTxns,
            witness: buffer_1.Buffer.concat([
                commitment,
                blockheader,
                voutAndTxData,
                merkleProof
            ])
        };
    }
    getGas(data) {
        return BitcoinOutputClaimHandler.gas;
    }
    getType() {
        return BitcoinOutputClaimHandler.type;
    }
}
exports.BitcoinOutputClaimHandler = BitcoinOutputClaimHandler;
BitcoinOutputClaimHandler.type = base_1.ChainSwapType.CHAIN;
BitcoinOutputClaimHandler.gas = 40000;
