"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMFees = void 0;
const Utils_1 = require("../../../utils/Utils");
/**
 * Fee estimation service for EVM chains.
 *
 * @category Chain Interface
 */
class EVMFees {
    /**
     * @param provider Underlying RPC provider providing read access to the EVM network
     * @param maxFeeRatePerGas Maximum fee rate for a transaction, default to 500 GWei
     * @param priorityFee Priority fee (or tip) to add to the transactions, default to 1 GWei
     * @param feeMultiplier Fee multiplier to multiply the RPC-returned fee rate with
     */
    constructor(provider, maxFeeRatePerGas = 500n * 1000000000n, priorityFee = 1n * 1000000000n, feeMultiplier = 1.25) {
        /**
         * @internal
         */
        this.MAX_FEE_AGE = 5000;
        /**
         * @internal
         */
        this.logger = (0, Utils_1.getLogger)("EVMFees: ");
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
        if (block == null)
            throw new Error("Latest block not found!");
        if (block.baseFeePerGas == null)
            throw new Error("Fee estimation is only possible for post-eip1559 blocks!");
        const baseFee = block.baseFeePerGas * this.feeMultiplierPPM / 1000000n;
        this.logger.debug("_getFeeRate(): Base fee rate: " + baseFee.toString(10));
        return baseFee;
    }
    /**
     * Gets the gas price with caching, format: `<base fee Wei>,<priority fee Wei>`
     */
    async getFeeRate() {
        if (this.blockFeeCache == null || Date.now() - this.blockFeeCache.timestamp > this.MAX_FEE_AGE) {
            let obj;
            this.blockFeeCache = obj = {
                timestamp: Date.now(),
                feeRate: this._getFeeRate().catch(e => {
                    if (this.blockFeeCache === obj)
                        delete this.blockFeeCache;
                    throw e;
                })
            };
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
     * @param gas Gas limit to add to the transaction
     * @param feeRate Serialized fee rate to add to the transaction, in format: `<baseFee>,<priorityFee>`
     */
    static getGasFee(gas, feeRate) {
        if (feeRate == null)
            return 0n;
        const [baseFee, priorityFee] = feeRate.split(",");
        return BigInt(gas) * (BigInt(baseFee) + BigInt(priorityFee));
    }
    /**
     * Applies the gas limit and fee rate to a transaction
     *
     * @param tx EVM Transaction to apply the fee rate to
     * @param gas Gas limit to add to the transaction
     * @param feeRate Serialized fee rate to add to the transaction, in format: `<baseFee>,<priorityFee>`
     */
    static applyFeeRate(tx, gas, feeRate) {
        if (feeRate == null)
            return;
        const [baseFee, priorityFee] = feeRate.split(",");
        tx.maxFeePerGas = BigInt(baseFee) + BigInt(priorityFee);
        tx.maxPriorityFeePerGas = BigInt(priorityFee);
        if (gas != null)
            tx.gasLimit = BigInt(gas);
    }
}
exports.EVMFees = EVMFees;
