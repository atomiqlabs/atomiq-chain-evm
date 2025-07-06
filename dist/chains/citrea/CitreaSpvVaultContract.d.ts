import { EVMSpvVaultContract } from "../../evm/spv_swap/EVMSpvVaultContract";
import { EVMSpvWithdrawalData } from "../../evm/spv_swap/EVMSpvWithdrawalData";
import { EVMSpvVaultData } from "../../evm/spv_swap/EVMSpvVaultData";
export declare class CitreaSpvVaultContract extends EVMSpvVaultContract<"CITREA"> {
    static readonly StateDiffSize: {
        BASE_DIFF_SIZE: number;
        ERC_20_TRANSFER_DIFF_SIZE: number;
        NATIVE_SELF_TRANSFER_DIFF_SIZE: number;
        NATIVE_TRANSFER_DIFF_SIZE: number;
        EXECUTION_SCHEDULE_DIFF_SIZE: number;
    };
    private calculateStateDiff;
    getClaimFee(signer: string, vault: EVMSpvVaultData, data: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint>;
    getFrontFee(signer: string, vault: EVMSpvVaultData, data: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint>;
}
