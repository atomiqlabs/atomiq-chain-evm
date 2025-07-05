import {EVMFees} from "../../evm/chain/modules/EVMFees";
import {getLogger} from "../../utils/Utils";

export class CitreaFees extends EVMFees {

    protected readonly logger = getLogger("CitreaFees: ");

    private _blockFeeCache: {
        timestamp: number,
        feeRate: Promise<{baseFee: bigint, l1Fee: bigint}>
    } = null;

    /**
     * Gets evm fee rate
     *
     * @private
     * @returns {Promise<bigint>} L1 gas price denominated in Wei
     */
    private async __getFeeRate(): Promise<{baseFee: bigint, l1Fee: bigint}> {
        const res = await this.provider.send("eth_getBlockByNumber", ["latest", false]);
        const l1Fee = BigInt(res.l1FeeRate);
        const baseFee = BigInt(res.baseFeePerGas) * this.feeMultiplierPPM / 1_000_000n;

        this.logger.debug("__getFeeRate(): Base fee rate: "+baseFee.toString(10)+", l1 fee rate: "+l1Fee.toString(10));

        return {baseFee, l1Fee};
    }

    /**
     * Gets the gas price with caching, format: <gas price in Wei>;<transaction version: v1/v3>
     *
     * @private
     */
    public async getFeeRate(): Promise<string> {
        if(this._blockFeeCache==null || Date.now() - this._blockFeeCache.timestamp > this.MAX_FEE_AGE) {
            let obj = {
                timestamp: Date.now(),
                feeRate: null
            };
            obj.feeRate = this.__getFeeRate().catch(e => {
                if(this._blockFeeCache===obj) this._blockFeeCache=null;
                throw e;
            });
            this._blockFeeCache = obj;
        }

        let {baseFee, l1Fee} = await this._blockFeeCache.feeRate;
        if(baseFee>this.maxFeeRatePerGas) baseFee = this.maxFeeRatePerGas;

        const fee = baseFee.toString(10)+","+this.priorityFee.toString(10)+","+l1Fee.toString(10);

        this.logger.debug("getFeeRate(): calculated fee: "+fee);

        return fee;
    }


    /**
     * Calculates the total gas fee paid for a given gas limit and state diff size at a given fee rate
     *
     * @param gas
     * @param stateDiffSize
     * @param feeRate
     */
    public static getGasFee(gas: number, feeRate: string, stateDiffSize: number = 0): bigint {
        if(feeRate==null) return 0n;

        const [maxFee, priorityFee, l1StateDiffFee] = feeRate.split(",");

        return (BigInt(gas) * BigInt(maxFee)) + (BigInt(stateDiffSize) * BigInt(l1StateDiffFee ?? 0n));
    }

}
