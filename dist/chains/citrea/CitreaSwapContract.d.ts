import { EVMSwapContract } from "../../evm/swaps/EVMSwapContract";
import { EVMSwapData } from "../../evm/swaps/EVMSwapData";
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
     * Get the estimated solana fee of the commit transaction
     */
    getCommitFee(swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
    getClaimFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
    /**
     * Get the estimated solana transaction fee of the refund transaction
     */
    getRefundFee(swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
}
