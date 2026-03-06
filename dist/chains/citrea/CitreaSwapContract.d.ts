import { EVMSwapContract } from "../../evm/swaps/EVMSwapContract";
import { EVMSwapData } from "../../evm/swaps/EVMSwapData";
/**
 * Citrea swap contract wrapper with fee estimation adjusted by expected state-diff size.
 *
 * @category Networks/Citrea
 */
export declare class CitreaSwapContract extends EVMSwapContract<"CITREA"> {
    static readonly StateDiffSize: {
        BASE_DIFF_SIZE: number;
        REPUTATION_UPDATE_DIFF_SIZE: number;
        LP_VAULT_UPDATE_DIFF_SIZE: number;
        ERC_20_TRANSFER_DIFF_SIZE: number;
        NATIVE_SELF_TRANSFER_DIFF_SIZE: number;
        NATIVE_TRANSFER_DIFF_SIZE: number;
    };
    private calculateStateDiff;
    /**
     * Returns estimated fee of the commit transaction, including Citrea state-diff overhead.
     */
    getCommitFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
    getClaimFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
    /**
     * Returns estimated fee of the refund transaction, including Citrea state-diff overhead.
     */
    getRefundFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
}
