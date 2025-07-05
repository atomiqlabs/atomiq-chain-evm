import { EVMTokens } from "../../evm/chain/modules/EVMTokens";
export declare class CitreaTokens extends EVMTokens {
    static readonly StateDiffSize: {
        APPROVE_DIFF_SIZE: number;
        TRANSFER_DIFF_SIZE: number;
    };
    getApproveFee(feeRate?: string): Promise<bigint>;
    getTransferFee(feeRate?: string): Promise<bigint>;
}
