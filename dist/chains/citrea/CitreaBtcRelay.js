"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitreaBtcRelay = void 0;
const EVMBtcRelay_1 = require("../../evm/btcrelay/EVMBtcRelay");
const Utils_1 = require("../../utils/Utils");
const CitreaFees_1 = require("./CitreaFees");
const logger = (0, Utils_1.getLogger)("CitreaBtcRelay: ");
class CitreaBtcRelay extends EVMBtcRelay_1.EVMBtcRelay {
    /**
     * Estimate required synchronization fee (worst case) to synchronize btc relay to the required blockheight
     *
     * @param requiredBlockheight
     * @param feeRate
     */
    async estimateSynchronizeFee(requiredBlockheight, feeRate) {
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        const tipData = await this.getTipData();
        if (tipData == null)
            throw new Error("Cannot get relay tip data, relay not initialized?");
        const currBlockheight = tipData.blockheight;
        const blockheightDelta = requiredBlockheight - currBlockheight;
        if (blockheightDelta <= 0)
            return 0n;
        const numTxs = Math.ceil(blockheightDelta / this.maxHeadersPerTx);
        const synchronizationFee = (BigInt(blockheightDelta) * await this.getFeePerBlock(feeRate))
            + CitreaFees_1.CitreaFees.getGasFee(EVMBtcRelay_1.EVMBtcRelay.GasCosts.GAS_BASE_MAIN * numTxs, feeRate, CitreaBtcRelay.StateDiffSize.STATE_DIFF_BASE * numTxs);
        logger.debug("estimateSynchronizeFee(): required blockheight: " + requiredBlockheight +
            " blockheight delta: " + blockheightDelta + " fee: " + synchronizationFee.toString(10));
        return synchronizationFee;
    }
    /**
     * Returns fee required (in native token) to synchronize a single block to btc relay
     *
     * @param feeRate
     */
    async getFeePerBlock(feeRate) {
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        return CitreaFees_1.CitreaFees.getGasFee(EVMBtcRelay_1.EVMBtcRelay.GasCosts.GAS_PER_BLOCKHEADER, feeRate, CitreaBtcRelay.StateDiffSize.STATE_DIFF_PER_BLOCKHEADER);
    }
}
exports.CitreaBtcRelay = CitreaBtcRelay;
CitreaBtcRelay.StateDiffSize = {
    STATE_DIFF_PER_BLOCKHEADER: 22,
    STATE_DIFF_BASE: 30
};
