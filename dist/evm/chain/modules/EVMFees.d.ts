import { JsonRpcApiProvider, TransactionRequest } from "ethers";
/**
 * Parsed EIP-1559 fee rate components.
 *
 * @category Chain Interface
 */
export type EVMFeeRate = {
    maxFeePerGas: bigint;
    maxPriorityFee: bigint;
};
/**
 * Fee estimation service for EVM chains.
 *
 * @category Chain Interface
 */
export declare class EVMFees {
    /**
     * @internal
     */
    protected MAX_FEE_AGE: number;
    /**
     * @internal
     */
    protected readonly logger: import("../../../utils/Utils").LoggerType;
    /**
     * @internal
     */
    protected readonly provider: JsonRpcApiProvider;
    /**
     * @internal
     */
    protected readonly maxFeeRatePerGas: bigint;
    /**
     * @internal
     */
    protected readonly priorityFee: bigint;
    /**
     * @internal
     */
    protected readonly feeMultiplierPPM: bigint;
    private blockFeeCache?;
    /**
     * @param provider Underlying RPC provider providing read access to the EVM network
     * @param maxFeeRatePerGas Maximum fee rate for a transaction, default to 500 GWei
     * @param priorityFee Priority fee (or tip) to add to the transactions, default to 1 GWei
     * @param feeMultiplier Fee multiplier to multiply the RPC-returned fee rate with
     */
    constructor(provider: JsonRpcApiProvider, maxFeeRatePerGas?: bigint, priorityFee?: bigint, feeMultiplier?: number);
    /**
     * Gets evm fee rate
     *
     * @private
     * @returns {Promise<bigint>} L1 gas price denominated in Wei
     */
    private _getFeeRate;
    /**
     * Gets the gas price with caching, format: `<base fee Wei>,<priority fee Wei>`
     */
    getFeeRate(): Promise<string>;
    /**
     * Calculates the total gas fee paid for a given gas limit at a given fee rate
     *
     * @param gas Gas limit to add to the transaction
     * @param feeRate Serialized fee rate to add to the transaction, in format: `<baseFee>,<priorityFee>`
     */
    static getGasFee(gas: number, feeRate: string): bigint;
    /**
     * Applies the gas limit and fee rate to a transaction
     *
     * @param tx EVM Transaction to apply the fee rate to
     * @param gas Gas limit to add to the transaction
     * @param feeRate Serialized fee rate to add to the transaction, in format: `<baseFee>,<priorityFee>`
     */
    static applyFeeRate(tx: TransactionRequest, gas: number | null, feeRate: string): void;
}
