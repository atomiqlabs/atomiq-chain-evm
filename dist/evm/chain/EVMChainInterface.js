"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMChainInterface = void 0;
const Utils_1 = require("../../utils/Utils");
const ethers_1 = require("ethers");
const EVMBlocks_1 = require("./modules/EVMBlocks");
const EVMEvents_1 = require("./modules/EVMEvents");
const EVMFees_1 = require("./modules/EVMFees");
const EVMTokens_1 = require("./modules/EVMTokens");
const EVMTransactions_1 = require("./modules/EVMTransactions");
const EVMSignatures_1 = require("./modules/EVMSignatures");
const EVMAddresses_1 = require("./modules/EVMAddresses");
const EVMSigner_1 = require("../wallet/EVMSigner");
const EVMBrowserSigner_1 = require("../wallet/EVMBrowserSigner");
class EVMChainInterface {
    constructor(chainId, evmChainId, provider, config, retryPolicy, evmFeeEstimator = new EVMFees_1.EVMFees(provider)) {
        var _a, _b, _c, _d;
        this.chainId = chainId;
        this.evmChainId = evmChainId;
        this.provider = provider;
        this.retryPolicy = retryPolicy;
        this.config = config;
        (_a = this.config).safeBlockTag ?? (_a.safeBlockTag = "safe");
        (_b = this.config).finalizedBlockTag ?? (_b.finalizedBlockTag = "finalized");
        (_c = this.config).finalityCheckStrategy ?? (_c.finalityCheckStrategy = { type: "timer" });
        (_d = this.config.finalityCheckStrategy).delayMs ?? (_d.delayMs = 1000);
        this.logger = (0, Utils_1.getLogger)("EVMChainInterface(" + this.evmChainId + "): ");
        this.Fees = evmFeeEstimator;
        this.Tokens = new EVMTokens_1.EVMTokens(this);
        this.Transactions = new EVMTransactions_1.EVMTransactions(this);
        this.Signatures = new EVMSignatures_1.EVMSignatures(this);
        this.Events = new EVMEvents_1.EVMEvents(this);
        this.Blocks = new EVMBlocks_1.EVMBlocks(this);
    }
    async getBalance(signer, tokenAddress) {
        //TODO: For native token we should discount the cost of transactions
        return await this.Tokens.getTokenBalance(signer, tokenAddress);
    }
    getNativeCurrencyAddress() {
        return this.Tokens.getNativeCurrencyAddress();
    }
    isValidToken(tokenIdentifier) {
        return this.Tokens.isValidToken(tokenIdentifier);
    }
    isValidAddress(address) {
        return EVMAddresses_1.EVMAddresses.isValidAddress(address);
    }
    normalizeAddress(address) {
        return (0, ethers_1.getAddress)(address);
    }
    ///////////////////////////////////
    //// Callbacks & handlers
    offBeforeTxReplace(callback) {
        return true;
    }
    onBeforeTxReplace(callback) { }
    onBeforeTxSigned(callback) {
        this.Transactions.onBeforeTxSigned(callback);
    }
    offBeforeTxSigned(callback) {
        return this.Transactions.offBeforeTxSigned(callback);
    }
    randomAddress() {
        return EVMAddresses_1.EVMAddresses.randomAddress();
    }
    randomSigner() {
        const wallet = ethers_1.Wallet.createRandom();
        return new EVMSigner_1.EVMSigner(wallet, wallet.address);
    }
    ////////////////////////////////////////////
    //// Transactions
    sendAndConfirm(signer, txs, waitForConfirmation, abortSignal, parallel, onBeforePublish, useAccessLists) {
        return this.Transactions.sendAndConfirm(signer, txs, waitForConfirmation, abortSignal, parallel, onBeforePublish, useAccessLists);
    }
    sendSignedAndConfirm(signedTxs, waitForConfirmation, abortSignal, parallel, onBeforePublish) {
        return this.Transactions.sendSignedAndConfirm(signedTxs, waitForConfirmation, abortSignal, parallel, onBeforePublish);
    }
    serializeTx(tx) {
        return this.Transactions.serializeTx(tx);
    }
    deserializeTx(txData) {
        return this.Transactions.deserializeTx(txData);
    }
    getTxIdStatus(txId) {
        return this.Transactions.getTxIdStatus(txId);
    }
    getTxStatus(tx) {
        return this.Transactions.getTxStatus(tx);
    }
    async getFinalizedBlock() {
        const block = await this.Blocks.getBlock(this.config.finalizedBlockTag);
        return {
            height: block.number,
            blockHash: block.hash
        };
    }
    async txsTransfer(signer, token, amount, dstAddress, feeRate) {
        return [await this.Tokens.Transfer(signer, token, amount, dstAddress, feeRate)];
    }
    async transfer(signer, token, amount, dstAddress, txOptions) {
        const tx = await this.Tokens.Transfer(signer.getAddress(), token, amount, dstAddress, txOptions?.feeRate);
        const [txId] = await this.Transactions.sendAndConfirm(signer, [tx], txOptions?.waitForConfirmation, txOptions?.abortSignal, false);
        return txId;
    }
    async wrapSigner(signer) {
        const address = await signer.getAddress();
        if (signer instanceof ethers_1.JsonRpcSigner || signer.provider instanceof ethers_1.BrowserProvider) {
            return new EVMBrowserSigner_1.EVMBrowserSigner(signer, address);
        }
        return new EVMSigner_1.EVMSigner(signer, address);
    }
}
exports.EVMChainInterface = EVMChainInterface;
