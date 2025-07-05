"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitreaSpvVaultContract = void 0;
const EVMSpvVaultContract_1 = require("../../evm/spv_swap/EVMSpvVaultContract");
const EVMFees_1 = require("../../evm/chain/modules/EVMFees");
class CitreaSpvVaultContract extends EVMSpvVaultContract_1.EVMSpvVaultContract {
    async getClaimFee(signer, withdrawalData, feeRate) {
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        return EVMFees_1.EVMFees.getGasFee(EVMSpvVaultContract_1.EVMSpvVaultContract.GasCosts.CLAIM, feeRate);
    }
    async getFrontFee(signer, withdrawalData, feeRate) {
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        return EVMFees_1.EVMFees.getGasFee(EVMSpvVaultContract_1.EVMSpvVaultContract.GasCosts.FRONT, feeRate);
    }
}
exports.CitreaSpvVaultContract = CitreaSpvVaultContract;
