"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMLpVault = void 0;
const EVMSwapModule_1 = require("../EVMSwapModule");
const EVMFees_1 = require("../../chain/modules/EVMFees");
class EVMLpVault extends EVMSwapModule_1.EVMSwapModule {
    /**
     * Action for withdrawing funds from the LP vault
     *
     * @param signer
     * @param token
     * @param amount
     * @param feeRate
     * @private
     */
    async Withdraw(signer, token, amount, feeRate) {
        const tx = await this.swapContract.withdraw.populateTransaction(token, amount, signer);
        tx.from = signer;
        tx.gasLimit = BigInt(EVMLpVault.GasCosts.WITHDRAW);
        EVMFees_1.EVMFees.applyFeeRate(tx, EVMLpVault.GasCosts.WITHDRAW, feeRate);
        return tx;
    }
    /**
     * Action for depositing funds to the LP vault
     *
     * @param signer
     * @param token
     * @param amount
     * @param feeRate
     * @private
     */
    async Deposit(signer, token, amount, feeRate) {
        const tx = await this.swapContract.deposit.populateTransaction(token, amount, {
            value: token.toLowerCase() === this.root.getNativeCurrencyAddress().toLowerCase() ? amount : 0n
        });
        tx.from = signer;
        EVMFees_1.EVMFees.applyFeeRate(tx, EVMLpVault.GasCosts.DEPOSIT, feeRate);
        return tx;
    }
    /**
     * Returns intermediary's reputation & vault balance for a specific token
     *
     * @param address
     * @param token
     */
    async getIntermediaryData(address, token) {
        const [balance, reputation] = await Promise.all([
            this.getIntermediaryBalance(address, token),
            this.getIntermediaryReputation(address, token)
        ]);
        return { balance, reputation };
    }
    /**
     * Returns intermediary's reputation for a specific token
     *
     * @param address
     * @param token
     */
    async getIntermediaryReputation(address, token) {
        const filter = Object.keys(this.contract.claimHandlersByAddress).map(claimHandler => ({ owner: address, token, claimHandler }));
        const resp = await this.swapContract.getReputation(filter);
        if (resp.length !== filter.length)
            throw new Error("getIntermediaryReputation(): Invalid response length");
        const result = {};
        Object.keys(this.contract.claimHandlersByAddress).forEach((address, index) => {
            const handler = this.contract.claimHandlersByAddress[address.toLowerCase()];
            const handlerResp = resp[index];
            result[handler.getType()] = {
                successVolume: handlerResp[0].amount,
                successCount: handlerResp[0].count,
                coopCloseVolume: handlerResp[1].amount,
                coopCloseCount: handlerResp[1].count,
                failVolume: handlerResp[2].amount,
                failCount: handlerResp[2].count,
            };
        });
        return result;
    }
    /**
     * Returns the balance of the token an intermediary has in his LP vault
     *
     * @param address
     * @param token
     */
    async getIntermediaryBalance(address, token) {
        const [balance] = await this.swapContract.getBalance([{ owner: address, token }]);
        this.logger.debug("getIntermediaryBalance(): token LP balance fetched, token: " + token.toString() +
            " address: " + address + " amount: " + (balance == null ? "null" : balance.toString()));
        return balance;
    }
    /**
     * Creates transactions for withdrawing funds from the LP vault, creates ATA if it doesn't exist and unwraps
     *  WSOL to SOL if required
     *
     * @param signer
     * @param token
     * @param amount
     * @param feeRate
     */
    async txsWithdraw(signer, token, amount, feeRate) {
        feeRate ?? (feeRate = await this.root.Fees.getFeeRate());
        const withdrawTx = await this.Withdraw(signer, token, amount, feeRate);
        this.logger.debug("txsWithdraw(): withdraw TX created, token: " + token.toString() +
            " amount: " + amount.toString(10));
        return [withdrawTx];
    }
    /**
     * Creates transaction for depositing funds into the LP vault, wraps SOL to WSOL if required
     *
     * @param signer
     * @param token
     * @param amount
     * @param feeRate
     */
    async txsDeposit(signer, token, amount, feeRate) {
        feeRate ?? (feeRate = await this.root.Fees.getFeeRate());
        const txs = [];
        //Approve first
        if (token.toLowerCase() !== this.root.getNativeCurrencyAddress().toLowerCase())
            txs.push(await this.root.Tokens.Approve(signer, token, amount, this.contract.contractAddress, feeRate));
        txs.push(await this.Deposit(signer, token, amount, feeRate));
        this.logger.debug("txsDeposit(): deposit TX created, token: " + token.toString() +
            " amount: " + amount.toString(10));
        return txs;
    }
}
exports.EVMLpVault = EVMLpVault;
EVMLpVault.GasCosts = {
    WITHDRAW: 100000 + 21000,
    DEPOSIT: 100000 + 21000
};
