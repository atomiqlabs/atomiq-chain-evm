import { EVMFees } from "../../evm/chain/modules/EVMFees";
export declare class CitreaFees extends EVMFees {
    protected readonly logger: import("../../utils/Utils").LoggerType;
    private _blockFeeCache;
    /**
     * Gets evm fee rate
     *
     * @private
     * @returns {Promise<bigint>} L1 gas price denominated in Wei
     */
    private __getFeeRate;
    /**
     * Gets the gas price with caching, format: <gas price in Wei>;<transaction version: v1/v3>
     *
     * @private
     */
    getFeeRate(): Promise<string>;
    /**
     * Calculates the total gas fee paid for a given gas limit and state diff size at a given fee rate
     *
     * @param gas
     * @param stateDiffSize
     * @param feeRate
     */
    static getGasFee(gas: number, feeRate: string, stateDiffSize?: number): bigint;
}
