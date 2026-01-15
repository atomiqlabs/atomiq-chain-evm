import { getLogger } from "../../../utils/Utils";
import {JsonRpcApiProvider, TransactionRequest} from "ethers";

export type EVMFeeRate = {
    maxFeePerGas: bigint;
    maxPriorityFee: bigint;
};

/**
 * @category Chain
 */
export class EVMFees {
    protected MAX_FEE_AGE = 5000;

    protected readonly logger = getLogger("EVMFees: ");

    protected readonly provider: JsonRpcApiProvider;
    protected readonly maxFeeRatePerGas: bigint;
    protected readonly priorityFee: bigint;

    protected readonly feeMultiplierPPM: bigint;

    private blockFeeCache?: {
        timestamp: number,
        feeRate: Promise<bigint>
    };

    constructor(
        provider: JsonRpcApiProvider,
        maxFeeRatePerGas: bigint = 500n * 1_000_000_000n,
        priorityFee: bigint = 1n * 1_000_000_000n,
        feeMultiplier: number = 1.25,
    ) {
        this.provider = provider;
        this.maxFeeRatePerGas = maxFeeRatePerGas;
        this.priorityFee = priorityFee;
        this.feeMultiplierPPM = BigInt(Math.floor(feeMultiplier * 1_000_000));
    }

    /**
     * Gets evm fee rate
     *
     * @private
     * @returns {Promise<bigint>} L1 gas price denominated in Wei
     */
    private async _getFeeRate(): Promise<bigint> {
        const block = await this.provider.getBlock("latest");
        if(block==null) throw new Error("Latest block not found!");
        if(block.baseFeePerGas==null) throw new Error("Fee estimation is only possible for post-eip1559 blocks!");

        const baseFee = block.baseFeePerGas * this.feeMultiplierPPM / 1_000_000n;
        this.logger.debug("_getFeeRate(): Base fee rate: "+baseFee.toString(10));

        return baseFee;
    }

    /**
     * Gets the gas price with caching, format: <base fee Wei>,<priority fee Wei>
     *
     * @private
     */
    public async getFeeRate(): Promise<string> {
        if(this.blockFeeCache==null || Date.now() - this.blockFeeCache.timestamp > this.MAX_FEE_AGE) {
            let obj: {
                timestamp: number,
                feeRate: Promise<bigint>
            };
            this.blockFeeCache = obj = {
                timestamp: Date.now(),
                feeRate: this._getFeeRate().catch(e => {
                    if(this.blockFeeCache===obj) delete this.blockFeeCache;
                    throw e;
                })
            };
        }

        let baseFee = await this.blockFeeCache.feeRate;
        if(baseFee>this.maxFeeRatePerGas) baseFee = this.maxFeeRatePerGas;

        const fee = baseFee.toString(10)+","+this.priorityFee.toString(10);

        this.logger.debug("getFeeRate(): calculated fee: "+fee);

        return fee;
    }

    /**
     * Calculates the total gas fee paid for a given gas limit at a given fee rate
     *
     * @param gas
     * @param feeRate
     */
    public static getGasFee(gas: number, feeRate: string): bigint {
        if(feeRate==null) return 0n;

        const [baseFee, priorityFee] = feeRate.split(",");

        return BigInt(gas) * (BigInt(baseFee) + BigInt(priorityFee));
    }

    public static applyFeeRate(tx: TransactionRequest, gas: number | null, feeRate: string): void {
        if(feeRate==null) return;

        const [baseFee, priorityFee] = feeRate.split(",");

        tx.maxFeePerGas = BigInt(baseFee) + BigInt(priorityFee);
        tx.maxPriorityFeePerGas = BigInt(priorityFee);
        if(gas!=null) tx.gasLimit = BigInt(gas);
    }

}
