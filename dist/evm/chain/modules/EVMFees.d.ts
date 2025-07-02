import { Provider, TransactionRequest } from "ethers";
export type EVMFeeRate = {
    maxFeePerGas: bigint;
    maxPriorityFee: bigint;
};
export declare class EVMFees {
    private readonly logger;
    private readonly provider;
    private readonly maxFeeRatePerGas;
    private readonly priorityFee;
    private readonly feeMultiplierPPM;
    private blockFeeCache;
    constructor(provider: Provider, maxFeeRatePerGas?: bigint, priorityFee?: bigint, feeMultiplier?: number);
    /**
     * Gets evm fee rate
     *
     * @private
     * @returns {Promise<bigint>} L1 gas price denominated in Wei
     */
    private _getFeeRate;
    /**
     * Gets the gas price with caching, format: <gas price in Wei>;<transaction version: v1/v3>
     *
     * @private
     */
    getFeeRate(): Promise<string>;
    /**
     * Calculates the total gas fee paid for a given gas limit at a given fee rate
     *
     * @param gas
     * @param feeRate
     */
    static getGasFee(gas: number, feeRate: string): bigint;
    static applyFeeRate(tx: TransactionRequest, gas: number, feeRate: string): any;
}
