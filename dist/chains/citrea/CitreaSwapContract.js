"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitreaSwapContract = void 0;
const EVMSwapContract_1 = require("../../evm/swaps/EVMSwapContract");
class CitreaSwapContract extends EVMSwapContract_1.EVMSwapContract {
    getClaimFee(signer, swapData, feeRate) {
        return this.Claim.getClaimFee(swapData, feeRate);
    }
    /**
     * Get the estimated solana fee of the commit transaction
     */
    getCommitFee(swapData, feeRate) {
        return this.Init.getInitFee(swapData, feeRate);
    }
    /**
     * Get the estimated solana transaction fee of the refund transaction
     */
    getRefundFee(swapData, feeRate) {
        return this.Refund.getRefundFee(swapData, feeRate);
    }
}
exports.CitreaSwapContract = CitreaSwapContract;
