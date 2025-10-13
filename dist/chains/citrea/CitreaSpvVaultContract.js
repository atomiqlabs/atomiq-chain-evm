"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitreaSpvVaultContract = void 0;
const EVMSpvVaultContract_1 = require("../../evm/spv_swap/EVMSpvVaultContract");
const EVMSpvVaultData_1 = require("../../evm/spv_swap/EVMSpvVaultData");
const ethers_1 = require("ethers");
const CitreaFees_1 = require("./CitreaFees");
const EVMAddresses_1 = require("../../evm/chain/modules/EVMAddresses");
class CitreaSpvVaultContract extends EVMSpvVaultContract_1.EVMSpvVaultContract {
    calculateStateDiff(signer, tokenStateChanges) {
        let stateDiffSize = 0;
        tokenStateChanges.forEach(val => {
            const [address, token] = val.split(":");
            if (token.toLowerCase() === this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                stateDiffSize += address.toLowerCase() === signer?.toLowerCase() ? CitreaSpvVaultContract.StateDiffSize.NATIVE_SELF_TRANSFER_DIFF_SIZE : CitreaSpvVaultContract.StateDiffSize.NATIVE_TRANSFER_DIFF_SIZE;
            }
            else {
                stateDiffSize += CitreaSpvVaultContract.StateDiffSize.ERC_20_TRANSFER_DIFF_SIZE;
            }
        });
        return stateDiffSize;
    }
    async getClaimFee(signer, vault, data, feeRate) {
        vault ?? (vault = EVMSpvVaultData_1.EVMSpvVaultData.randomVault());
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        const tokenStateChanges = new Set();
        let diffSize = CitreaSpvVaultContract.StateDiffSize.BASE_DIFF_SIZE;
        const recipient = data != null ? data.recipient : EVMAddresses_1.EVMAddresses.randomAddress();
        if (data == null || (data.rawAmounts[0] != null && data.rawAmounts[0] > 0n)) {
            tokenStateChanges.add(recipient.toLowerCase() + ":" + vault.token0.token.toLowerCase());
            if (data == null || data.frontingFeeRate > 0n)
                tokenStateChanges.add(ethers_1.ZeroAddress + ":" + vault.token0.token.toLowerCase()); //Also needs to pay out to fronter
            if (data == null || data.callerFeeRate > 0n)
                tokenStateChanges.add(signer + ":" + vault.token0.token.toLowerCase()); //Also needs to pay out to caller
        }
        if (data == null || (data.rawAmounts[1] != null && data.rawAmounts[1] > 0n)) {
            tokenStateChanges.add(recipient.toLowerCase() + ":" + vault.token1.token.toLowerCase());
            if (data == null || data.frontingFeeRate > 0n)
                tokenStateChanges.add(ethers_1.ZeroAddress + ":" + vault.token1.token.toLowerCase()); //Also needs to pay out to fronter
            if (data == null || data.callerFeeRate > 0n)
                tokenStateChanges.add(signer + ":" + vault.token1.token.toLowerCase()); //Also needs to pay out to caller
        }
        diffSize += this.calculateStateDiff(signer, tokenStateChanges);
        if (data == null || (data.executionHash != null && data.executionHash !== ethers_1.ZeroHash))
            diffSize += CitreaSpvVaultContract.StateDiffSize.EXECUTION_SCHEDULE_DIFF_SIZE;
        const gasFee = await super.getClaimFee(signer, vault, data, feeRate);
        return gasFee + CitreaFees_1.CitreaFees.getGasFee(0, feeRate, diffSize);
    }
    async getFrontFee(signer, vault, data, feeRate) {
        vault ?? (vault = EVMSpvVaultData_1.EVMSpvVaultData.randomVault());
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        const tokenStateChanges = new Set();
        let diffSize = CitreaSpvVaultContract.StateDiffSize.BASE_DIFF_SIZE;
        if (data == null || (data.rawAmounts[0] != null && data.rawAmounts[0] > 0n)) {
            tokenStateChanges.add(signer + ":" + vault.token0.token.toLowerCase());
        }
        if (data == null || (data.rawAmounts[1] != null && data.rawAmounts[1] > 0n)) {
            tokenStateChanges.add(signer + ":" + vault.token1.token.toLowerCase());
        }
        diffSize += this.calculateStateDiff(signer, tokenStateChanges);
        if (data == null || (data.executionHash != null && data.executionHash !== ethers_1.ZeroHash))
            diffSize += CitreaSpvVaultContract.StateDiffSize.EXECUTION_SCHEDULE_DIFF_SIZE;
        const gasFee = await super.getFrontFee(signer, vault, data, feeRate);
        return gasFee + CitreaFees_1.CitreaFees.getGasFee(0, feeRate, diffSize);
    }
}
exports.CitreaSpvVaultContract = CitreaSpvVaultContract;
CitreaSpvVaultContract.StateDiffSize = {
    BASE_DIFF_SIZE: 50,
    ERC_20_TRANSFER_DIFF_SIZE: 50,
    NATIVE_SELF_TRANSFER_DIFF_SIZE: 20,
    NATIVE_TRANSFER_DIFF_SIZE: 55,
    EXECUTION_SCHEDULE_DIFF_SIZE: 40
};
