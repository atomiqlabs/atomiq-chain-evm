import { EVMSpvVaultContract } from "../../evm/spv_swap/EVMSpvVaultContract";
import { EVMSpvWithdrawalData } from "../../evm/spv_swap/EVMSpvWithdrawalData";
export declare class CitreaSpvVaultContract extends EVMSpvVaultContract<"CITREA"> {
    getClaimFee(signer: string, withdrawalData: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint>;
    getFrontFee(signer: string, withdrawalData: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint>;
}
