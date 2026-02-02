"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitcoinNoncedOutputClaimHandler = void 0;
const base_1 = require("@atomiqlabs/base");
const IBitcoinClaimHandler_1 = require("./IBitcoinClaimHandler");
const btc_signer_1 = require("@scure/btc-signer");
const buffer_1 = require("buffer");
const ethers_1 = require("ethers");
function getTransactionNonce(btcTx) {
    const locktimeSub500M = BigInt(btcTx.lockTime - 500000000);
    if (locktimeSub500M < 0n)
        throw new Error("Locktime too low!");
    const nSequence = BigInt(btcTx.getInput(0).sequence);
    return (locktimeSub500M << 24n) | (nSequence & 0x00ffffffn);
}
/**
 * @category Internal/Handlers
 */
class BitcoinNoncedOutputClaimHandler extends IBitcoinClaimHandler_1.IBitcoinClaimHandler {
    serializeCommitment(data) {
        const txoHash = (0, ethers_1.solidityPackedKeccak256)(["uint64", "uint64", "bytes32"], [data.nonce, data.amount, (0, ethers_1.keccak256)(data.output)]);
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
            amount: out.amount,
            nonce: getTransactionNonce(parsedBtcTx)
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
        return BitcoinNoncedOutputClaimHandler.gas;
    }
    getType() {
        return BitcoinNoncedOutputClaimHandler.type;
    }
}
exports.BitcoinNoncedOutputClaimHandler = BitcoinNoncedOutputClaimHandler;
BitcoinNoncedOutputClaimHandler.type = base_1.ChainSwapType.CHAIN_NONCED;
BitcoinNoncedOutputClaimHandler.gas = 40000;
