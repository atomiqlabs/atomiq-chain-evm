import { EVMSwapContract } from "../../evm/swaps/EVMSwapContract";
import { EVMSwapData } from "../../evm/swaps/EVMSwapData";
export declare class CitreaSwapContract extends EVMSwapContract<"CITREA"> {
    getClaimFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
    /**
     * Get the estimated solana fee of the commit transaction
     */
    getCommitFee(swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
    /**
     * Get the estimated solana transaction fee of the refund transaction
     */
    getRefundFee(swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
}
