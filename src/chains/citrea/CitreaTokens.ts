import {EVMTokens} from "../../evm/chain/modules/EVMTokens";
import {CitreaFees} from "./CitreaFees";


export class CitreaTokens extends EVMTokens {

    public static readonly StateDiffSize = {
        APPROVE_DIFF_SIZE: 35,
        TRANSFER_DIFF_SIZE: 55
    };

    async getApproveFee(feeRate?: string): Promise<bigint> {
        feeRate ??= await this.root.Fees.getFeeRate();
        return CitreaFees.getGasFee(EVMTokens.GasCosts.APPROVE, feeRate, CitreaTokens.StateDiffSize.APPROVE_DIFF_SIZE);
    }

    async getTransferFee(feeRate?: string): Promise<bigint> {
        feeRate ??= await this.root.Fees.getFeeRate();
        return CitreaFees.getGasFee(EVMTokens.GasCosts.APPROVE, feeRate, CitreaTokens.StateDiffSize.TRANSFER_DIFF_SIZE);
    }

}