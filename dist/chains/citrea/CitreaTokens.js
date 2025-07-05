"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitreaTokens = void 0;
const EVMTokens_1 = require("../../evm/chain/modules/EVMTokens");
const CitreaFees_1 = require("./CitreaFees");
class CitreaTokens extends EVMTokens_1.EVMTokens {
    async getApproveFee(feeRate) {
        feeRate ?? (feeRate = await this.root.Fees.getFeeRate());
        return CitreaFees_1.CitreaFees.getGasFee(EVMTokens_1.EVMTokens.GasCosts.APPROVE, feeRate, CitreaTokens.StateDiffSize.APPROVE_DIFF_SIZE);
    }
    async getTransferFee(feeRate) {
        feeRate ?? (feeRate = await this.root.Fees.getFeeRate());
        return CitreaFees_1.CitreaFees.getGasFee(EVMTokens_1.EVMTokens.GasCosts.APPROVE, feeRate, CitreaTokens.StateDiffSize.TRANSFER_DIFF_SIZE);
    }
}
exports.CitreaTokens = CitreaTokens;
CitreaTokens.StateDiffSize = {
    APPROVE_DIFF_SIZE: 35,
    TRANSFER_DIFF_SIZE: 55
};
