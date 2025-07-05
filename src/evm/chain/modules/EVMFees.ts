import { getLogger } from "../../../utils/Utils";
import {JsonRpcApiProvider, TransactionRequest} from "ethers";

export type EVMFeeRate = {
    maxFeePerGas: bigint;
    maxPriorityFee: bigint;
};

export class EVMFees {
    protected MAX_FEE_AGE = 5000;

    protected readonly logger = getLogger("EVMFees: ");

    protected readonly provider: JsonRpcApiProvider;
    protected readonly maxFeeRatePerGas: bigint;
    protected readonly priorityFee: bigint;

    protected readonly feeMultiplierPPM: bigint;

    private blockFeeCache: {
        timestamp: number,
        feeRate: Promise<bigint>
    } = null;

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

        const baseFee = block.baseFeePerGas * this.feeMultiplierPPM / 1_000_000n;
        this.logger.debug("_getFeeRate(): Base fee rate: "+baseFee.toString(10));

        return baseFee;
    }

    /**
     * Gets the gas price with caching, format: <gas price in Wei>;<transaction version: v1/v3>
     *
     * @private
     */
    public async getFeeRate(): Promise<string> {
        if(this.blockFeeCache==null || Date.now() - this.blockFeeCache.timestamp > this.MAX_FEE_AGE) {
            let obj = {
                timestamp: Date.now(),
                feeRate: null
            };
            obj.feeRate = this._getFeeRate().catch(e => {
                if(this.blockFeeCache===obj) this.blockFeeCache=null;
                throw e;
            });
            this.blockFeeCache = obj;
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

    public static applyFeeRate(tx: TransactionRequest, gas: number, feeRate: string) {
        if(feeRate==null) return null;

        const [baseFee, priorityFee] = feeRate.split(",");

        tx.maxFeePerGas = BigInt(baseFee) + BigInt(priorityFee);
        tx.maxPriorityFeePerGas = BigInt(priorityFee);
        tx.gasLimit = BigInt(gas);
    }

}
