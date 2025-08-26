import { JsonRpcApiProvider, TransactionRequest } from "ethers";
export type EVMFeeRate = {
    maxFeePerGas: bigint;
    maxPriorityFee: bigint;
};
export declare class EVMFees {
    protected MAX_FEE_AGE: number;
    protected readonly logger: import("../../../utils/Utils").LoggerType;
    protected readonly provider: JsonRpcApiProvider;
    protected readonly maxFeeRatePerGas: bigint;
    protected readonly priorityFee: bigint;
    protected readonly feeMultiplierPPM: bigint;
    private blockFeeCache;
    constructor(provider: JsonRpcApiProvider, maxFeeRatePerGas?: bigint, priorityFee?: bigint, feeMultiplier?: number);
    /**
     * Gets evm fee rate
     *
     * @private
     * @returns {Promise<bigint>} L1 gas price denominated in Wei
     */
    private _getFeeRate;
    /**
     * Gets the gas price with caching, format: <base fee Wei>,<priority fee Wei>
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
