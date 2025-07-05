import { EVMBtcRelay } from "../../evm/btcrelay/EVMBtcRelay";
import { BtcBlock } from "@atomiqlabs/base";
export declare class CitreaBtcRelay<B extends BtcBlock> extends EVMBtcRelay<B> {
    static StateDiffSize: {
        STATE_DIFF_PER_BLOCKHEADER: number;
        STATE_DIFF_BASE: number;
    };
    /**
     * Estimate required synchronization fee (worst case) to synchronize btc relay to the required blockheight
     *
     * @param requiredBlockheight
     * @param feeRate
     */
    estimateSynchronizeFee(requiredBlockheight: number, feeRate?: string): Promise<bigint>;
    /**
     * Returns fee required (in native token) to synchronize a single block to btc relay
     *
     * @param feeRate
     */
    getFeePerBlock(feeRate?: string): Promise<bigint>;
}
