"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMFees = void 0;
const Utils_1 = require("../../../utils/Utils");
class EVMFees {
    constructor(provider, maxFeeRatePerGas = 500n * 1000000000n, priorityFee = 1n * 1000000000n, feeMultiplier = 1.25) {
        this.MAX_FEE_AGE = 5000;
        this.logger = (0, Utils_1.getLogger)("EVMFees: ");
        this.blockFeeCache = null;
        this.provider = provider;
        this.maxFeeRatePerGas = maxFeeRatePerGas;
        this.priorityFee = priorityFee;
        this.feeMultiplierPPM = BigInt(Math.floor(feeMultiplier * 1000000));
    }
    /**
     * Gets evm fee rate
     *
     * @private
     * @returns {Promise<bigint>} L1 gas price denominated in Wei
     */
    async _getFeeRate() {
        const block = await this.provider.getBlock("latest");
        const baseFee = block.baseFeePerGas * this.feeMultiplierPPM / 1000000n;
        this.logger.debug("_getFeeRate(): Base fee rate: " + baseFee.toString(10));
        return baseFee;
    }
    /**
     * Gets the gas price with caching, format: <gas price in Wei>;<transaction version: v1/v3>
     *
     * @private
     */
    async getFeeRate() {
        if (this.blockFeeCache == null || Date.now() - this.blockFeeCache.timestamp > this.MAX_FEE_AGE) {
            let obj = {
                timestamp: Date.now(),
                feeRate: null
            };
            obj.feeRate = this._getFeeRate().catch(e => {
                if (this.blockFeeCache === obj)
                    this.blockFeeCache = null;
                throw e;
            });
            this.blockFeeCache = obj;
        }
        let baseFee = await this.blockFeeCache.feeRate;
        if (baseFee > this.maxFeeRatePerGas)
            baseFee = this.maxFeeRatePerGas;
        const fee = baseFee.toString(10) + "," + this.priorityFee.toString(10);
        this.logger.debug("getFeeRate(): calculated fee: " + fee);
        return fee;
    }
    /**
     * Calculates the total gas fee paid for a given gas limit at a given fee rate
     *
     * @param gas
     * @param feeRate
     */
    static getGasFee(gas, feeRate) {
        if (feeRate == null)
            return 0n;
        const [maxFee, priorityFee] = feeRate.split(",");
        return BigInt(gas) * BigInt(maxFee);
    }
    static applyFeeRate(tx, gas, feeRate) {
        if (feeRate == null)
            return null;
        const [baseFee, priorityFee] = feeRate.split(",");
        tx.maxFeePerGas = BigInt(baseFee) + BigInt(priorityFee);
        tx.maxPriorityFeePerGas = BigInt(priorityFee);
        tx.gasLimit = BigInt(gas) + 21000n;
    }
}
exports.EVMFees = EVMFees;
