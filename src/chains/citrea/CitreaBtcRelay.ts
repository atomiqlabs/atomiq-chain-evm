import {EVMBtcRelay} from "../../evm/btcrelay/EVMBtcRelay";
import {BtcBlock} from "@atomiqlabs/base";
import {getLogger} from "../../utils/Utils";
import {CitreaFees} from "./CitreaFees";

const logger = getLogger("CitreaBtcRelay: ");

export class CitreaBtcRelay<B extends BtcBlock> extends EVMBtcRelay<B> {

    public static StateDiffSize = {
        STATE_DIFF_PER_BLOCKHEADER: 22,
        STATE_DIFF_BASE: 30
    }

    /**
     * Estimate required synchronization fee (worst case) to synchronize btc relay to the required blockheight
     *
     * @param requiredBlockheight
     * @param feeRate
     */
    public async estimateSynchronizeFee(requiredBlockheight: number, feeRate?: string): Promise<bigint> {
        feeRate ??= await this.Chain.Fees.getFeeRate();
        const tipData = await this.getTipData();
        const currBlockheight = tipData.blockheight;

        const blockheightDelta = requiredBlockheight-currBlockheight;

        if(blockheightDelta<=0) return 0n;

        const numTxs = Math.ceil(blockheightDelta / this.maxHeadersPerTx);

        const synchronizationFee = (BigInt(blockheightDelta) * await this.getFeePerBlock(feeRate))
            + CitreaFees.getGasFee(
                EVMBtcRelay.GasCosts.GAS_BASE_MAIN * numTxs,
                feeRate,
                CitreaBtcRelay.StateDiffSize.STATE_DIFF_BASE * numTxs
            );
        logger.debug("estimateSynchronizeFee(): required blockheight: "+requiredBlockheight+
            " blockheight delta: "+blockheightDelta+" fee: "+synchronizationFee.toString(10));

        return synchronizationFee;
    }

    /**
     * Returns fee required (in native token) to synchronize a single block to btc relay
     *
     * @param feeRate
     */
    public async getFeePerBlock(feeRate?: string): Promise<bigint> {
        feeRate ??= await this.Chain.Fees.getFeeRate();
        return CitreaFees.getGasFee(
            EVMBtcRelay.GasCosts.GAS_PER_BLOCKHEADER,
            feeRate,
            CitreaBtcRelay.StateDiffSize.STATE_DIFF_PER_BLOCKHEADER
        );
    }

}