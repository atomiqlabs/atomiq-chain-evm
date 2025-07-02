"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMTokens = void 0;
const EVMModule_1 = require("../EVMModule");
const ethers_1 = require("ethers");
const ERC20Abi_1 = require("./ERC20Abi");
const EVMAddresses_1 = require("./EVMAddresses");
const EVMFees_1 = require("./EVMFees");
class EVMTokens extends EVMModule_1.EVMModule {
    getContract(address) {
        return new ethers_1.Contract(address, ERC20Abi_1.ERC20Abi, this.root.provider);
    }
    ///////////////////
    //// Tokens
    /**
     * Checks if the provided string is a valid starknet token
     *
     * @param token
     */
    isValidToken(token) {
        return EVMAddresses_1.EVMAddresses.isValidAddress(token);
    }
    /**
     * Returns the token balance of the address
     *
     * @param address
     * @param token
     */
    async getTokenBalance(address, token) {
        let balance;
        if (token === "0x0000000000000000000000000000000000000000") {
            balance = await this.provider.getBalance(address);
        }
        else {
            const erc20 = this.getContract(token);
            balance = await erc20.balanceOf(address);
        }
        this.logger.debug("getTokenBalance(): token balance fetched, token: " + token +
            " address: " + address + " amount: " + balance.toString(10));
        return balance;
    }
    /**
     * Returns the native currency address
     */
    getNativeCurrencyAddress() {
        return "0x0000000000000000000000000000000000000000";
    }
    ///////////////////
    //// Transfers
    /**
     * Creates transactions for sending the over the tokens
     *
     * @param signer
     * @param token token to send
     * @param amount amount of the token to send
     * @param recipient recipient's address
     * @param feeRate fee rate to use for the transactions
     * @private
     */
    async Transfer(signer, token, amount, recipient, feeRate) {
        let tx;
        if (token === this.getNativeCurrencyAddress()) {
            tx = {
                to: recipient,
                value: amount
            };
        }
        else {
            tx = await this.getContract(token).transfer.populateTransaction(recipient, amount);
        }
        tx.from = signer;
        EVMFees_1.EVMFees.applyFeeRate(tx, EVMTokens.GasCosts.TRANSFER, feeRate ?? await this.root.Fees.getFeeRate());
        this.logger.debug("txsTransfer(): transfer TX created, recipient: " + recipient.toString() +
            " token: " + token.toString() + " amount: " + amount.toString(10));
        return tx;
    }
    ///////////////////
    //// Approval
    /**
     * Creates transactions for approving spending of tokens
     *
     * @param signer
     * @param token token to send
     * @param amount amount of the token to send
     * @param spender recipient's address
     * @param feeRate fee rate to use for the transactions
     * @private
     */
    async Approve(signer, token, amount, spender, feeRate) {
        if (token === this.getNativeCurrencyAddress())
            return null;
        const tx = await this.getContract(token).approve.populateTransaction(spender, amount);
        tx.from = signer;
        EVMFees_1.EVMFees.applyFeeRate(tx, EVMTokens.GasCosts.APPROVE, feeRate ?? await this.root.Fees.getFeeRate());
        this.logger.debug("txsTransfer(): approve TX created, spender: " + spender.toString() +
            " token: " + token.toString() + " amount: " + amount.toString(10));
        return tx;
    }
}
exports.EVMTokens = EVMTokens;
EVMTokens.ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
EVMTokens.GasCosts = {
    TRANSFER: 80000,
    APPROVE: 80000
};
