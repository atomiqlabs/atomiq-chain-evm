import {EVMSpvVaultContract} from "../../evm/spv_swap/EVMSpvVaultContract";
import {EVMSpvWithdrawalData} from "../../evm/spv_swap/EVMSpvWithdrawalData";
import {EVMSpvVaultData} from "../../evm/spv_swap/EVMSpvVaultData";
import {ZeroHash} from "ethers/lib.esm";
import {ZeroAddress} from "ethers";
import {CitreaFees} from "./CitreaFees";


export class CitreaSpvVaultContract extends EVMSpvVaultContract<"CITREA"> {

    public static readonly StateDiffSize = {
        BASE_DIFF_SIZE: 50,
        ERC_20_TRANSFER_DIFF_SIZE: 50,
        NATIVE_SELF_TRANSFER_DIFF_SIZE: 20,
        NATIVE_TRANSFER_DIFF_SIZE: 30,
        EXECUTION_SCHEDULE_DIFF_SIZE: 40
    };

    private calculateStateDiff(signer: string, tokenStateChanges: Set<string>): number {
        let stateDiffSize = 0;
        tokenStateChanges.forEach(val => {
            const [address, token] = val.split(":");
            if(token.toLowerCase()===this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                stateDiffSize += address.toLowerCase()===signer?.toLowerCase() ? CitreaSpvVaultContract.StateDiffSize.NATIVE_SELF_TRANSFER_DIFF_SIZE : CitreaSpvVaultContract.StateDiffSize.NATIVE_TRANSFER_DIFF_SIZE;
            } else {
                stateDiffSize += CitreaSpvVaultContract.StateDiffSize.ERC_20_TRANSFER_DIFF_SIZE;
            }
        });
        return stateDiffSize;
    }

    async getClaimFee(signer: string, vault: EVMSpvVaultData, data: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint> {
        feeRate ??= await this.Chain.Fees.getFeeRate();
        const tokenStateChanges: Set<string> = new Set();

        let diffSize = CitreaSpvVaultContract.StateDiffSize.BASE_DIFF_SIZE;
        if (data.rawAmounts[0] != null && data.rawAmounts[0] > 0n) {
            tokenStateChanges.add(data.recipient.toLowerCase()+":"+vault.token0.token.toLowerCase());
            if (data.frontingFeeRate > 0n) tokenStateChanges.add(ZeroAddress+":"+vault.token0.token.toLowerCase()); //Also needs to pay out to fronter
            if (data.callerFeeRate > 0n) tokenStateChanges.add(signer+":"+vault.token0.token.toLowerCase()); //Also needs to pay out to caller
        }
        if (data.rawAmounts[1] != null && data.rawAmounts[1] > 0n) {
            tokenStateChanges.add(data.recipient.toLowerCase()+":"+vault.token1.token.toLowerCase());
            if (data.frontingFeeRate > 0n) tokenStateChanges.add(ZeroAddress+":"+vault.token1.token.toLowerCase()); //Also needs to pay out to fronter
            if (data.callerFeeRate > 0n) tokenStateChanges.add(signer+":"+vault.token1.token.toLowerCase()); //Also needs to pay out to caller
        }
        diffSize += this.calculateStateDiff(signer, tokenStateChanges);
        if (data.executionHash != null && data.executionHash !== ZeroHash) diffSize += CitreaSpvVaultContract.StateDiffSize.EXECUTION_SCHEDULE_DIFF_SIZE;

        const gasFee = await super.getClaimFee(signer, vault, data, feeRate);
        return gasFee + CitreaFees.getGasFee(0, feeRate, diffSize);
    }

    async getFrontFee(signer: string, vault: EVMSpvVaultData, data: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint> {
        feeRate ??= await this.Chain.Fees.getFeeRate();
        const tokenStateChanges: Set<string> = new Set();

        let diffSize = CitreaSpvVaultContract.StateDiffSize.BASE_DIFF_SIZE;
        if (data.rawAmounts[0] != null && data.rawAmounts[0] > 0n) {
            tokenStateChanges.add(signer+":"+vault.token0.token.toLowerCase());
        }
        if (data.rawAmounts[1] != null && data.rawAmounts[1] > 0n) {
            tokenStateChanges.add(signer+":"+vault.token1.token.toLowerCase());
        }
        diffSize += this.calculateStateDiff(signer, tokenStateChanges);
        if (data.executionHash != null && data.executionHash !== ZeroHash) diffSize += CitreaSpvVaultContract.StateDiffSize.EXECUTION_SCHEDULE_DIFF_SIZE;

        const gasFee = await super.getFrontFee(signer, vault, data, feeRate);
        return gasFee + CitreaFees.getGasFee(0, feeRate, diffSize);
    }

}
