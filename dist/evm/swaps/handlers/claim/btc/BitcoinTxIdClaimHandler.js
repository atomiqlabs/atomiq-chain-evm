"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitcoinTxIdClaimHandler = void 0;
const base_1 = require("@atomiqlabs/base");
const IBitcoinClaimHandler_1 = require("./IBitcoinClaimHandler");
const buffer_1 = require("buffer");
/**
 * @category Internal/Handlers
 */
class BitcoinTxIdClaimHandler extends IBitcoinClaimHandler_1.IBitcoinClaimHandler {
    serializeCommitment(data) {
        return buffer_1.Buffer.concat([
            buffer_1.Buffer.from(data.txId, "hex").reverse(),
            super.serializeCommitment(data)
        ]);
    }
    getWitness(signer, swapData, witnessData, feeRate) {
        if (!swapData.isClaimHandler(this.address))
            throw new Error("Invalid claim handler");
        return this._getWitness(signer, swapData, witnessData, { txId: witnessData.tx.txid });
    }
    getGas(data) {
        return BitcoinTxIdClaimHandler.gas;
    }
    getType() {
        return BitcoinTxIdClaimHandler.type;
    }
}
exports.BitcoinTxIdClaimHandler = BitcoinTxIdClaimHandler;
BitcoinTxIdClaimHandler.type = base_1.ChainSwapType.CHAIN_TXID;
BitcoinTxIdClaimHandler.gas = 10000;
