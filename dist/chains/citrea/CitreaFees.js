"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitreaFees = void 0;
const EVMFees_1 = require("../../evm/chain/modules/EVMFees");
const Utils_1 = require("../../utils/Utils");
class CitreaFees extends EVMFees_1.EVMFees {
    constructor() {
        super(...arguments);
        this.logger = (0, Utils_1.getLogger)("CitreaFees: ");
        this._blockFeeCache = null;
    }
    /**
     * Gets evm fee rate
     *
     * @private
     * @returns {Promise<bigint>} L1 gas price denominated in Wei
     */
    async __getFeeRate() {
        const res = await this.provider.send("eth_getBlockByNumber", ["latest", false]);
        const l1Fee = BigInt(res.l1FeeRate);
        const baseFee = BigInt(res.baseFeePerGas) * this.feeMultiplierPPM / 1000000n;
        this.logger.debug("__getFeeRate(): Base fee rate: " + baseFee.toString(10) + ", l1 fee rate: " + l1Fee.toString(10));
        return { baseFee, l1Fee };
    }
    /**
     * Gets the gas price with caching, format: <gas price in Wei>;<transaction version: v1/v3>
     *
     * @private
     */
    async getFeeRate() {
        if (this._blockFeeCache == null || Date.now() - this._blockFeeCache.timestamp > this.MAX_FEE_AGE) {
            let obj = {
                timestamp: Date.now(),
                feeRate: null
            };
            obj.feeRate = this.__getFeeRate().catch(e => {
                if (this._blockFeeCache === obj)
                    this._blockFeeCache = null;
                throw e;
            });
            this._blockFeeCache = obj;
        }
        let { baseFee, l1Fee } = await this._blockFeeCache.feeRate;
        if (baseFee > this.maxFeeRatePerGas)
            baseFee = this.maxFeeRatePerGas;
        const fee = baseFee.toString(10) + "," + this.priorityFee.toString(10) + "," + l1Fee.toString(10);
        this.logger.debug("getFeeRate(): calculated fee: " + fee);
        return fee;
    }
    /**
     * Calculates the total gas fee paid for a given gas limit and state diff size at a given fee rate
     *
     * @param gas
     * @param stateDiffSize
     * @param feeRate
     */
    static getGasFee(gas, feeRate, stateDiffSize = 0) {
        if (feeRate == null)
            return 0n;
        const [maxFee, priorityFee, l1StateDiffFee] = feeRate.split(",");
        return (BigInt(gas) * BigInt(maxFee)) + (BigInt(stateDiffSize) * BigInt(l1StateDiffFee ?? 0n));
    }
}
exports.CitreaFees = CitreaFees;
