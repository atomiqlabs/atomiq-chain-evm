"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSwapClaim = void 0;
const base_1 = require("@atomiqlabs/base");
const EVMSwapModule_1 = require("../EVMSwapModule");
const EVMFees_1 = require("../../chain/modules/EVMFees");
class EVMSwapClaim extends EVMSwapModule_1.EVMSwapModule {
    /**
     * Claim action which uses the provided witness for claiming the swap
     *
     * @param signer
     * @param swapData
     * @param witness
     * @param feeRate
     * @param claimHandlerGas
     * @private
     */
    async Claim(signer, swapData, witness, feeRate, claimHandlerGas) {
        //TODO: Claim with success action not supported yet!
        const tx = await this.swapContract.claim.populateTransaction(swapData.toEscrowStruct(), witness);
        tx.from = signer;
        EVMFees_1.EVMFees.applyFeeRate(tx, this.getClaimGas(swapData) + (claimHandlerGas ?? 0), feeRate);
        return tx;
    }
    /**
     * Creates transactions claiming the swap using a secret (for HTLC swaps)
     *
     * @param signer
     * @param swapData swap to claim
     * @param secret hex encoded secret pre-image to the HTLC hash
     * @param checkExpiry whether to check if the swap is already expired (trying to claim an expired swap with a secret
     *  is dangerous because we might end up revealing the secret to the counterparty without being able to claim the swap)
     * @param feeRate fee rate to use for the transaction
     */
    async txsClaimWithSecret(signer, swapData, secret, checkExpiry, feeRate) {
        //We need to be sure that this transaction confirms in time, otherwise we reveal the secret to the counterparty
        // and won't claim the funds
        if (checkExpiry && await this.contract.isExpired(swapData.claimer.toString(), swapData)) {
            throw new base_1.SwapDataVerificationError("Not enough time to reliably pay the invoice");
        }
        const claimHandler = this.contract.claimHandlersByAddress[swapData.claimHandler.toLowerCase()];
        if (claimHandler == null)
            throw new base_1.SwapDataVerificationError("Unknown claim handler!");
        if (claimHandler.getType() !== base_1.ChainSwapType.HTLC)
            throw new base_1.SwapDataVerificationError("Invalid claim handler!");
        feeRate ?? (feeRate = await this.root.Fees.getFeeRate());
        const { initialTxns, witness } = await claimHandler.getWitness(signer, swapData, secret, feeRate);
        const tx = await this.Claim(signer, swapData, witness, feeRate, claimHandler.getGas(swapData));
        this.logger.debug("txsClaimWithSecret(): creating claim transaction, swap: " + swapData.getClaimHash() + " witness: ", witness.toString("hex"));
        return [...initialTxns, tx];
    }
    /**
     * Creates transaction claiming the swap using a confirmed transaction data (for BTC on-chain swaps)
     *
     * @param signer
     * @param swapData swap to claim
     * @param tx bitcoin transaction that satisfies the swap condition
     * @param requiredConfirmations
     * @param vout vout of the bitcoin transaction that satisfies the swap condition
     * @param commitedHeader commited header data from btc relay (fetched internally if null)
     * @param synchronizer optional synchronizer to use in case we need to sync up the btc relay ourselves
     * @param feeRate fee rate to be used for the transactions
     */
    async txsClaimWithTxData(signer, swapData, tx, requiredConfirmations, vout, commitedHeader, synchronizer, feeRate) {
        const claimHandler = this.contract.claimHandlersByAddress[swapData.claimHandler.toLowerCase()];
        if (claimHandler == null)
            throw new base_1.SwapDataVerificationError("Unknown claim handler!");
        if (claimHandler.getType() !== base_1.ChainSwapType.CHAIN_NONCED &&
            claimHandler.getType() !== base_1.ChainSwapType.CHAIN_TXID &&
            claimHandler.getType() !== base_1.ChainSwapType.CHAIN)
            throw new base_1.SwapDataVerificationError("Invalid claim handler!");
        feeRate ?? (feeRate = await this.root.Fees.getFeeRate());
        const { initialTxns, witness } = await claimHandler.getWitness(signer, swapData, {
            tx,
            vout,
            requiredConfirmations,
            commitedHeader,
            btcRelay: this.contract.btcRelay,
            synchronizer,
        }, feeRate);
        const claimTx = await this.Claim(signer, swapData, witness, feeRate, claimHandler.getGas(swapData));
        return [...initialTxns, claimTx];
    }
    getClaimGas(swapData) {
        let totalGas = EVMSwapClaim.GasCosts.BASE;
        if (swapData.reputation)
            totalGas += EVMSwapClaim.GasCosts.REPUTATION;
        if (swapData.isPayOut()) {
            if (swapData.isToken(this.root.getNativeCurrencyAddress())) {
                totalGas += EVMSwapClaim.GasCosts.NATIVE_TRANSFER;
            }
            else {
                totalGas += EVMSwapClaim.GasCosts.ERC20_TRANSFER;
            }
        }
        else {
            totalGas += EVMSwapClaim.GasCosts.LP_VAULT_TRANSFER;
        }
        if (swapData.getClaimerBounty() > 0n) {
            if (swapData.isDepositToken(this.root.getNativeCurrencyAddress())) {
                totalGas += EVMSwapClaim.GasCosts.NATIVE_TRANSFER;
            }
            else {
                totalGas += EVMSwapClaim.GasCosts.ERC20_TRANSFER;
            }
        }
        if (swapData.getSecurityDeposit() > swapData.getClaimerBounty()) {
            if (swapData.isDepositToken(this.root.getNativeCurrencyAddress())) {
                totalGas += EVMSwapClaim.GasCosts.NATIVE_TRANSFER;
            }
            else {
                totalGas += EVMSwapClaim.GasCosts.ERC20_TRANSFER;
            }
        }
        return totalGas;
    }
    /**
     * Get the estimated starknet transaction fee of the claim transaction
     */
    async getClaimFee(swapData, feeRate) {
        feeRate ?? (feeRate = await this.root.Fees.getFeeRate());
        //TODO: Claim with success action not supported yet!
        let gasRequired = this.getClaimGas(swapData);
        const claimHandler = this.contract.claimHandlersByAddress[swapData.claimHandler.toLowerCase()];
        if (claimHandler != null)
            gasRequired += claimHandler.getGas(swapData);
        return EVMFees_1.EVMFees.getGasFee(gasRequired, feeRate);
    }
}
exports.EVMSwapClaim = EVMSwapClaim;
EVMSwapClaim.GasCosts = {
    BASE: 30000 + 21000,
    ERC20_TRANSFER: 40000,
    NATIVE_TRANSFER: 35500,
    LP_VAULT_TRANSFER: 10000,
    REPUTATION: 25000
};
