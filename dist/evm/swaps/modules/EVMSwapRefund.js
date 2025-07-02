"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSwapRefund = void 0;
const base_1 = require("@atomiqlabs/base");
const Utils_1 = require("../../../utils/Utils");
const EVMSwapModule_1 = require("../EVMSwapModule");
const EVMFees_1 = require("../../chain/modules/EVMFees");
const Refund = [
    { name: "swapHash", type: "bytes32" },
    { name: "timeout", type: "uint256" }
];
class EVMSwapRefund extends EVMSwapModule_1.EVMSwapModule {
    /**
     * Action for generic Refund instruction
     *
     * @param signer
     * @param swapData
     * @param witness
     * @param feeRate
     * @param handlerGas
     * @private
     */
    async Refund(signer, swapData, witness, feeRate, handlerGas) {
        const tx = await this.swapContract.refund.populateTransaction(swapData.toEscrowStruct(), witness);
        tx.from = signer;
        EVMFees_1.EVMFees.applyFeeRate(tx, (swapData.payIn ? EVMSwapRefund.GasCosts.REFUND_PAY_OUT : EVMSwapRefund.GasCosts.REFUND) + (handlerGas ?? 0), feeRate);
        return tx;
    }
    /**
     * Action for cooperative refunding with signature
     *
     * @param sender
     * @param swapData
     * @param timeout
     * @param signature
     * @param feeRate
     * @private
     */
    async RefundWithSignature(sender, swapData, timeout, signature, feeRate) {
        const tx = await this.swapContract.cooperativeRefund.populateTransaction(swapData.toEscrowStruct(), signature, BigInt(timeout));
        tx.from = sender;
        EVMFees_1.EVMFees.applyFeeRate(tx, swapData.payIn ? EVMSwapRefund.GasCosts.REFUND_PAY_OUT : EVMSwapRefund.GasCosts.REFUND, feeRate);
        return tx;
    }
    async signSwapRefund(signer, swapData, authorizationTimeout) {
        const authPrefix = "refund";
        const authTimeout = Math.floor(Date.now() / 1000) + authorizationTimeout;
        const signature = await this.root.Signatures.signTypedMessage(this.contract.contractAddress, signer, Refund, "Refund", {
            "swapHash": "0x" + swapData.getEscrowHash(),
            "timeout": BigInt(authTimeout)
        });
        return {
            prefix: authPrefix,
            timeout: authTimeout.toString(10),
            signature: signature
        };
    }
    async isSignatureValid(swapData, timeout, prefix, signature) {
        if (prefix !== "refund")
            throw new base_1.SignatureVerificationError("Invalid prefix");
        const expiryTimestamp = BigInt(timeout);
        const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
        const isExpired = (expiryTimestamp - currentTimestamp) < BigInt(this.contract.authGracePeriod);
        if (isExpired)
            throw new base_1.SignatureVerificationError("Authorization expired!");
        const valid = await this.root.Signatures.isValidSignature(this.contract.contractAddress, signature, swapData.claimer, Refund, "Refund", {
            "swapHash": "0x" + swapData.getEscrowHash(),
            "timeout": BigInt(expiryTimestamp)
        });
        if (!valid) {
            throw new base_1.SignatureVerificationError("Invalid signature!");
        }
        return null;
    }
    /**
     * Creates transactions required for refunding timed out swap
     *
     * @param signer
     * @param swapData swap data to refund
     * @param check whether to check if swap is already expired and refundable
     * @param feeRate fee rate to be used for the transactions
     * @param witnessData
     */
    async txsRefund(signer, swapData, check, feeRate, witnessData) {
        const refundHandler = this.contract.refundHandlersByAddress[swapData.refundHandler.toLowerCase()];
        if (refundHandler == null)
            throw new Error("Invalid refund handler");
        if (check && !await (0, Utils_1.tryWithRetries)(() => this.contract.isRequestRefundable(swapData.offerer.toString(), swapData), this.retryPolicy)) {
            throw new base_1.SwapDataVerificationError("Not refundable yet!");
        }
        feeRate ?? (feeRate = await this.root.Fees.getFeeRate());
        const { initialTxns, witness } = await refundHandler.getWitness(signer, swapData, witnessData, feeRate);
        const tx = await this.Refund(signer, swapData, witness, feeRate, refundHandler.getGas(swapData));
        this.logger.debug("txsRefund(): creating refund transaction, swap: " + swapData.getClaimHash());
        return [...initialTxns, tx];
    }
    /**
     * Creates transactions required for refunding the swap with authorization signature, also unwraps WSOL to SOL
     *
     * @param signer
     * @param swapData swap data to refund
     * @param timeout signature timeout
     * @param prefix signature prefix of the counterparty
     * @param signature signature of the counterparty
     * @param check whether to check if swap is committed before attempting refund
     * @param feeRate fee rate to be used for the transactions
     */
    async txsRefundWithAuthorization(signer, swapData, timeout, prefix, signature, check, feeRate) {
        if (check && !await (0, Utils_1.tryWithRetries)(() => this.contract.isCommited(swapData), this.retryPolicy)) {
            throw new base_1.SwapDataVerificationError("Not correctly committed");
        }
        await (0, Utils_1.tryWithRetries)(() => this.isSignatureValid(swapData, timeout, prefix, signature), this.retryPolicy, (e) => e instanceof base_1.SignatureVerificationError);
        feeRate ?? (feeRate = await this.root.Fees.getFeeRate());
        const tx = await this.RefundWithSignature(signer, swapData, timeout, signature, feeRate);
        this.logger.debug("txsRefundWithAuthorization(): creating refund transaction, swap: " + swapData.getClaimHash() +
            " auth expiry: " + timeout + " signature: " + signature);
        return [tx];
    }
    /**
     * Get the estimated solana transaction fee of the refund transaction, in the worst case scenario in case where the
     *  ATA needs to be initialized again (i.e. adding the ATA rent exempt lamports to the fee)
     */
    async getRefundFee(swapData, feeRate) {
        feeRate ?? (feeRate = await this.root.Fees.getFeeRate());
        return EVMFees_1.EVMFees.getGasFee(swapData.payIn ? EVMSwapRefund.GasCosts.REFUND_PAY_OUT : EVMSwapRefund.GasCosts.REFUND, feeRate);
    }
}
exports.EVMSwapRefund = EVMSwapRefund;
EVMSwapRefund.GasCosts = {
    REFUND: 100000,
    REFUND_PAY_OUT: 130000
};
