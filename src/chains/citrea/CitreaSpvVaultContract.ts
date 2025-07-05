import {EVMSpvVaultContract} from "../../evm/spv_swap/EVMSpvVaultContract";
import {EVMSpvWithdrawalData} from "../../evm/spv_swap/EVMSpvWithdrawalData";
import {EVMFees} from "../../evm/chain/modules/EVMFees";


export class CitreaSpvVaultContract extends EVMSpvVaultContract<"CITREA"> {

    async getClaimFee(signer: string, withdrawalData: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint> {
        feeRate ??= await this.Chain.Fees.getFeeRate();
        return EVMFees.getGasFee(EVMSpvVaultContract.GasCosts.CLAIM, feeRate);
    }

    async getFrontFee(signer: string, withdrawalData: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint> {
        feeRate ??= await this.Chain.Fees.getFeeRate();
        return EVMFees.getGasFee(EVMSpvVaultContract.GasCosts.FRONT, feeRate);
    }

}
