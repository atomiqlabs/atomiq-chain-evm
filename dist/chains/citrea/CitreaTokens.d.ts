import { EVMTokens } from "../../evm/chain/modules/EVMTokens";
/**
 * Citrea-specific token module that augments fee estimation with state-diff costs.
 *
 * @category Networks/Citrea
 */
export declare class CitreaTokens extends EVMTokens {
    static readonly StateDiffSize: {
        APPROVE_DIFF_SIZE: number;
        TRANSFER_DIFF_SIZE: number;
    };
    getApproveFee(feeRate?: string): Promise<bigint>;
    getTransferFee(feeRate?: string): Promise<bigint>;
}
