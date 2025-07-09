"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSwapContract = void 0;
const base_1 = require("@atomiqlabs/base");
const buffer_1 = require("buffer");
const TimelockRefundHandler_1 = require("./handlers/refund/TimelockRefundHandler");
const ClaimHandlers_1 = require("./handlers/claim/ClaimHandlers");
const sha2_1 = require("@noble/hashes/sha2");
const EVMContractBase_1 = require("../contract/EVMContractBase");
const EVMSwapData_1 = require("./EVMSwapData");
const EscrowManagerAbi_1 = require("./EscrowManagerAbi");
const ethers_1 = require("ethers");
const EVMLpVault_1 = require("./modules/EVMLpVault");
const EVMSwapInit_1 = require("./modules/EVMSwapInit");
const EVMSwapRefund_1 = require("./modules/EVMSwapRefund");
const EVMSwapClaim_1 = require("./modules/EVMSwapClaim");
const ESCROW_STATE_COMMITTED = 1;
const ESCROW_STATE_CLAIMED = 2;
const ESCROW_STATE_REFUNDED = 3;
class EVMSwapContract extends EVMContractBase_1.EVMContractBase {
    constructor(chainInterface, btcRelay, contractAddress, handlerAddresses) {
        super(chainInterface, contractAddress, EscrowManagerAbi_1.EscrowManagerAbi);
        this.supportsInitWithoutClaimer = true;
        ////////////////////////
        //// Timeouts
        this.claimWithSecretTimeout = 180;
        this.claimWithTxDataTimeout = 180;
        this.refundTimeout = 180;
        this.claimGracePeriod = 10 * 60;
        this.refundGracePeriod = 10 * 60;
        this.authGracePeriod = 30;
        ////////////////////////
        //// Handlers
        this.claimHandlersByAddress = {};
        this.claimHandlersBySwapType = {};
        this.refundHandlersByAddress = {};
        this.chainId = chainInterface.chainId;
        this.Init = new EVMSwapInit_1.EVMSwapInit(chainInterface, this);
        this.Refund = new EVMSwapRefund_1.EVMSwapRefund(chainInterface, this);
        this.Claim = new EVMSwapClaim_1.EVMSwapClaim(chainInterface, this);
        this.LpVault = new EVMLpVault_1.EVMLpVault(chainInterface, this);
        this.btcRelay = btcRelay;
        ClaimHandlers_1.claimHandlersList.forEach(handlerCtor => {
            const handler = new handlerCtor(handlerAddresses.claim[handlerCtor.type]);
            this.claimHandlersByAddress[handler.address.toLowerCase()] = handler;
            this.claimHandlersBySwapType[handlerCtor.type] = handler;
        });
        this.timelockRefundHandler = new TimelockRefundHandler_1.TimelockRefundHandler(handlerAddresses.refund.timelock);
        this.refundHandlersByAddress[this.timelockRefundHandler.address.toLowerCase()] = this.timelockRefundHandler;
    }
    async start() {
    }
    ////////////////////////////////////////////
    //// Signatures
    preFetchForInitSignatureVerification() {
        return this.Init.preFetchForInitSignatureVerification();
    }
    getInitSignature(signer, swapData, authorizationTimeout, preFetchedBlockData, feeRate) {
        return this.Init.signSwapInitialization(signer, swapData, authorizationTimeout);
    }
    isValidInitAuthorization(sender, swapData, { timeout, prefix, signature }, feeRate, preFetchedData) {
        return this.Init.isSignatureValid(sender, swapData, timeout, prefix, signature, preFetchedData);
    }
    getInitAuthorizationExpiry(swapData, { timeout, prefix, signature }, preFetchedData) {
        return this.Init.getSignatureExpiry(timeout);
    }
    isInitAuthorizationExpired(swapData, { timeout, prefix, signature }) {
        return this.Init.isSignatureExpired(timeout);
    }
    getRefundSignature(signer, swapData, authorizationTimeout) {
        return this.Refund.signSwapRefund(signer, swapData, authorizationTimeout);
    }
    isValidRefundAuthorization(swapData, { timeout, prefix, signature }) {
        return this.Refund.isSignatureValid(swapData, timeout, prefix, signature);
    }
    getDataSignature(signer, data) {
        return this.Chain.Signatures.getDataSignature(signer, data);
    }
    isValidDataSignature(data, signature, publicKey) {
        return this.Chain.Signatures.isValidDataSignature(data, signature, publicKey);
    }
    ////////////////////////////////////////////
    //// Swap data utils
    /**
     * Checks whether the claim is claimable by us, that means not expired, we are claimer & the swap is commited
     *
     * @param signer
     * @param data
     */
    async isClaimable(signer, data) {
        if (!data.isClaimer(signer))
            return false;
        if (await this.isExpired(signer, data))
            return false;
        return await this.isCommited(data);
    }
    /**
     * Checks whether a swap is commited, i.e. the swap still exists on-chain and was not claimed nor refunded
     *
     * @param swapData
     */
    async isCommited(swapData) {
        const data = await this.contract.getHashState("0x" + swapData.getEscrowHash());
        return Number(data.state) === ESCROW_STATE_COMMITTED;
    }
    /**
     * Checks whether the swap is expired, takes into consideration possible on-chain time skew, therefore for claimer
     *  the swap expires a bit sooner than it should've & for the offerer it expires a bit later
     *
     * @param signer
     * @param data
     */
    isExpired(signer, data) {
        let currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
        if (data.isClaimer(signer))
            currentTimestamp = currentTimestamp + BigInt(this.claimGracePeriod);
        if (data.isOfferer(signer))
            currentTimestamp = currentTimestamp - BigInt(this.refundGracePeriod);
        return Promise.resolve(data.getExpiry() < currentTimestamp);
    }
    /**
     * Checks if the swap is refundable by us, checks if we are offerer, if the swap is already expired & if the swap
     *  is still commited
     *
     * @param signer
     * @param data
     */
    async isRequestRefundable(signer, data) {
        //Swap can only be refunded by the offerer
        if (!data.isOfferer(signer))
            return false;
        if (!(await this.isExpired(signer, data)))
            return false;
        return await this.isCommited(data);
    }
    getHashForTxId(txId, confirmations) {
        return buffer_1.Buffer.from(this.claimHandlersBySwapType[base_1.ChainSwapType.CHAIN_TXID].getCommitment({
            txId,
            confirmations,
            btcRelay: this.btcRelay
        }).slice(2), "hex");
    }
    /**
     * Get the swap payment hash to be used for an on-chain swap, uses poseidon hash of the value
     *
     * @param outputScript output script required to claim the swap
     * @param amount sats sent required to claim the swap
     * @param confirmations
     * @param nonce swap nonce uniquely identifying the transaction to prevent replay attacks
     */
    getHashForOnchain(outputScript, amount, confirmations, nonce) {
        let result;
        if (nonce == null || nonce === 0n) {
            result = this.claimHandlersBySwapType[base_1.ChainSwapType.CHAIN].getCommitment({
                output: outputScript,
                amount,
                confirmations,
                btcRelay: this.btcRelay
            });
        }
        else {
            result = this.claimHandlersBySwapType[base_1.ChainSwapType.CHAIN_NONCED].getCommitment({
                output: outputScript,
                amount,
                nonce,
                confirmations,
                btcRelay: this.btcRelay
            });
        }
        return buffer_1.Buffer.from(result.slice(2), "hex");
    }
    /**
     * Get the swap payment hash to be used for a lightning htlc swap, uses poseidon hash of the sha256 hash of the preimage
     *
     * @param paymentHash payment hash of the HTLC
     */
    getHashForHtlc(paymentHash) {
        return buffer_1.Buffer.from(this.claimHandlersBySwapType[base_1.ChainSwapType.HTLC].getCommitment(paymentHash).slice(2), "hex");
    }
    getExtraData(outputScript, amount, confirmations, nonce) {
        if (nonce == null)
            nonce = 0n;
        const txoHash = buffer_1.Buffer.from((0, sha2_1.sha256)(buffer_1.Buffer.concat([
            base_1.BigIntBufferUtils.toBuffer(amount, "le", 8),
            outputScript
        ])));
        return buffer_1.Buffer.concat([
            txoHash,
            base_1.BigIntBufferUtils.toBuffer(nonce, "be", 8),
            base_1.BigIntBufferUtils.toBuffer(BigInt(confirmations), "be", 2)
        ]);
    }
    ////////////////////////////////////////////
    //// Swap data getters
    /**
     * Gets the status of the specific swap, this also checks if we are offerer/claimer & checks for expiry (to see
     *  if swap is refundable)
     *
     * @param signer
     * @param data
     */
    async getCommitStatus(signer, data) {
        const escrowHash = data.getEscrowHash();
        const stateData = await this.contract.getHashState("0x" + escrowHash);
        const state = Number(stateData.state);
        const blockHeight = Number(stateData.finishBlockheight);
        switch (state) {
            case ESCROW_STATE_COMMITTED:
                if (data.isOfferer(signer) && await this.isExpired(signer, data))
                    return { type: base_1.SwapCommitStateType.REFUNDABLE };
                return { type: base_1.SwapCommitStateType.COMMITED };
            case ESCROW_STATE_CLAIMED:
                return {
                    type: base_1.SwapCommitStateType.PAID,
                    getTxBlock: async () => {
                        return {
                            blockTime: await this.Chain.Blocks.getBlockTime(blockHeight),
                            blockHeight: blockHeight
                        };
                    },
                    getClaimTxId: async () => {
                        const events = await this.Events.getContractBlockEvents(["Claim"], [null, null, "0x" + escrowHash], blockHeight, blockHeight);
                        return events.length === 0 ? null : events[0].transactionHash;
                    }
                };
            default:
                return {
                    type: await this.isExpired(signer, data) ? base_1.SwapCommitStateType.EXPIRED : base_1.SwapCommitStateType.NOT_COMMITED,
                    getTxBlock: async () => {
                        return {
                            blockTime: await this.Chain.Blocks.getBlockTime(blockHeight),
                            blockHeight: blockHeight
                        };
                    },
                    getRefundTxId: async () => {
                        const events = await this.Events.getContractBlockEvents(["Refund"], [null, null, "0x" + escrowHash], blockHeight, blockHeight);
                        return events.length === 0 ? null : events[0].transactionHash;
                    }
                };
        }
    }
    /**
     * Returns the data committed for a specific payment hash, or null if no data is currently commited for
     *  the specific swap
     *
     * @param paymentHashHex
     */
    async getCommitedData(paymentHashHex) {
        //TODO: Noop
        return null;
    }
    ////////////////////////////////////////////
    //// Swap data initializer
    createSwapData(type, offerer, claimer, token, amount, paymentHash, sequence, expiry, payIn, payOut, securityDeposit, claimerBounty, depositToken = this.Chain.Tokens.getNativeCurrencyAddress()) {
        return Promise.resolve(new EVMSwapData_1.EVMSwapData(offerer, claimer, token, this.timelockRefundHandler.address, this.claimHandlersBySwapType?.[type]?.address, payOut, payIn, payIn, //For now track reputation for all payIn swaps
        sequence, "0x" + paymentHash, (0, ethers_1.hexlify)(base_1.BigIntBufferUtils.toBuffer(expiry, "be", 32)), amount, depositToken, securityDeposit, claimerBounty, type, null));
    }
    ////////////////////////////////////////////
    //// Utils
    async getBalance(signer, tokenAddress, inContract) {
        if (inContract)
            return await this.getIntermediaryBalance(signer, tokenAddress);
        return await this.Chain.getBalance(signer, tokenAddress);
    }
    getIntermediaryData(address, token) {
        return this.LpVault.getIntermediaryData(address, token);
    }
    getIntermediaryReputation(address, token) {
        return this.LpVault.getIntermediaryReputation(address, token);
    }
    getIntermediaryBalance(address, token) {
        return this.LpVault.getIntermediaryBalance(address, token);
    }
    ////////////////////////////////////////////
    //// Transaction initializers
    async txsClaimWithSecret(signer, swapData, secret, checkExpiry, initAta, feeRate, skipAtaCheck) {
        return this.Claim.txsClaimWithSecret(typeof (signer) === "string" ? signer : signer.getAddress(), swapData, secret, checkExpiry, feeRate);
    }
    async txsClaimWithTxData(signer, swapData, tx, requiredConfirmations, vout, commitedHeader, synchronizer, initAta, feeRate) {
        return this.Claim.txsClaimWithTxData(typeof (signer) === "string" ? signer : signer.getAddress(), swapData, tx, requiredConfirmations, vout, commitedHeader, synchronizer, feeRate);
    }
    txsRefund(signer, swapData, check, initAta, feeRate) {
        return this.Refund.txsRefund(signer, swapData, check, feeRate);
    }
    txsRefundWithAuthorization(signer, swapData, { timeout, prefix, signature }, check, initAta, feeRate) {
        return this.Refund.txsRefundWithAuthorization(signer, swapData, timeout, prefix, signature, check, feeRate);
    }
    txsInit(signer, swapData, { timeout, prefix, signature }, skipChecks, feeRate) {
        return this.Init.txsInit(signer, swapData, timeout, prefix, signature, skipChecks, feeRate);
    }
    txsWithdraw(signer, token, amount, feeRate) {
        return this.LpVault.txsWithdraw(signer, token, amount, feeRate);
    }
    txsDeposit(signer, token, amount, feeRate) {
        return this.LpVault.txsDeposit(signer, token, amount, feeRate);
    }
    ////////////////////////////////////////////
    //// Executors
    async claimWithSecret(signer, swapData, secret, checkExpiry, initAta, txOptions) {
        const result = await this.Claim.txsClaimWithSecret(signer.getAddress(), swapData, secret, checkExpiry, txOptions?.feeRate);
        const [signature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return signature;
    }
    async claimWithTxData(signer, swapData, tx, requiredConfirmations, vout, commitedHeader, synchronizer, initAta, txOptions) {
        const txs = await this.Claim.txsClaimWithTxData(signer.getAddress(), swapData, tx, requiredConfirmations, vout, commitedHeader, synchronizer, txOptions?.feeRate);
        if (txs === null)
            throw new Error("Btc relay not synchronized to required blockheight!");
        const txHashes = await this.Chain.sendAndConfirm(signer, txs, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return txHashes[txHashes.length - 1];
    }
    async refund(signer, swapData, check, initAta, txOptions) {
        let result = await this.txsRefund(signer.getAddress(), swapData, check, initAta, txOptions?.feeRate);
        const [signature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return signature;
    }
    async refundWithAuthorization(signer, swapData, signature, check, initAta, txOptions) {
        let result = await this.txsRefundWithAuthorization(signer.getAddress(), swapData, signature, check, initAta, txOptions?.feeRate);
        const [txSignature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return txSignature;
    }
    async init(signer, swapData, signature, skipChecks, txOptions) {
        if (swapData.isPayIn()) {
            if (!swapData.isOfferer(signer.getAddress()) && !swapData.isOfferer(signer.getAddress()))
                throw new Error("Invalid signer provided!");
        }
        else {
            if (!swapData.isClaimer(signer.getAddress()) && !swapData.isOfferer(signer.getAddress()))
                throw new Error("Invalid signer provided!");
        }
        let result = await this.txsInit(signer.getAddress(), swapData, signature, skipChecks, txOptions?.feeRate);
        const txHashes = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return txHashes[txHashes.length - 1];
    }
    async withdraw(signer, token, amount, txOptions) {
        const txs = await this.LpVault.txsWithdraw(signer.getAddress(), token, amount, txOptions?.feeRate);
        const [txId] = await this.Chain.sendAndConfirm(signer, txs, txOptions?.waitForConfirmation, txOptions?.abortSignal, false);
        return txId;
    }
    async deposit(signer, token, amount, txOptions) {
        const txs = await this.LpVault.txsDeposit(signer.getAddress(), token, amount, txOptions?.feeRate);
        const [txId] = await this.Chain.sendAndConfirm(signer, txs, txOptions?.waitForConfirmation, txOptions?.abortSignal, false);
        return txId;
    }
    ////////////////////////////////////////////
    //// Fees
    getInitPayInFeeRate(offerer, claimer, token, paymentHash) {
        return this.Chain.Fees.getFeeRate();
    }
    getInitFeeRate(offerer, claimer, token, paymentHash) {
        return this.Chain.Fees.getFeeRate();
    }
    getRefundFeeRate(swapData) {
        return this.Chain.Fees.getFeeRate();
    }
    getClaimFeeRate(signer, swapData) {
        return this.Chain.Fees.getFeeRate();
    }
    getClaimFee(signer, swapData, feeRate) {
        return this.Claim.getClaimFee(swapData, feeRate);
    }
    /**
     * Get the estimated fee of the commit transaction
     */
    getCommitFee(signer, swapData, feeRate) {
        return this.Init.getInitFee(swapData, feeRate);
    }
    /**
     * Get the estimated transaction fee of the refund transaction
     */
    getRefundFee(signer, swapData, feeRate) {
        return this.Refund.getRefundFee(swapData, feeRate);
    }
}
exports.EVMSwapContract = EVMSwapContract;
