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
const Utils_1 = require("../../utils/Utils");
const ESCROW_STATE_COMMITTED = 1;
const ESCROW_STATE_CLAIMED = 2;
const ESCROW_STATE_REFUNDED = 3;
const logger = (0, Utils_1.getLogger)("EVMSwapContract: ");
/**
 * @category Swaps
 */
class EVMSwapContract extends EVMContractBase_1.EVMContractBase {
    constructor(chainInterface, btcRelay, contractAddress, handlerAddresses, contractDeploymentHeight) {
        super(chainInterface, contractAddress, EscrowManagerAbi_1.EscrowManagerAbi, contractDeploymentHeight);
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
    /**
     * @inheritDoc
     */
    async start() {
    }
    ////////////////////////////////////////////
    //// Signatures
    /**
     * @inheritDoc
     */
    preFetchForInitSignatureVerification() {
        return this.Init.preFetchForInitSignatureVerification();
    }
    /**
     * @inheritDoc
     */
    getInitSignature(signer, swapData, authorizationTimeout, preFetchedBlockData, feeRate) {
        return this.Init.signSwapInitialization(signer, swapData, authorizationTimeout);
    }
    /**
     * @inheritDoc
     */
    isValidInitAuthorization(sender, swapData, signature, feeRate, preFetchedData) {
        return this.Init.isSignatureValid(sender, swapData, signature.timeout, signature.prefix, signature.signature, preFetchedData);
    }
    /**
     * @inheritDoc
     */
    getInitAuthorizationExpiry(swapData, signature, preFetchedData) {
        return this.Init.getSignatureExpiry(signature.timeout);
    }
    /**
     * @inheritDoc
     */
    isInitAuthorizationExpired(swapData, signature) {
        return this.Init.isSignatureExpired(signature.timeout);
    }
    /**
     * @inheritDoc
     */
    getRefundSignature(signer, swapData, authorizationTimeout) {
        return this.Refund.signSwapRefund(signer, swapData, authorizationTimeout);
    }
    /**
     * @inheritDoc
     */
    isValidRefundAuthorization(swapData, signature) {
        return this.Refund.isSignatureValid(swapData, signature.timeout, signature.prefix, signature.signature);
    }
    /**
     * @inheritDoc
     */
    getDataSignature(signer, data) {
        return this.Chain.Signatures.getDataSignature(signer, data);
    }
    /**
     * @inheritDoc
     */
    isValidDataSignature(data, signature, publicKey) {
        return this.Chain.Signatures.isValidDataSignature(data, signature, publicKey);
    }
    ////////////////////////////////////////////
    //// Swap data utils
    /**
     * @inheritDoc
     */
    async isClaimable(signer, data) {
        if (!data.isClaimer(signer))
            return false;
        if (await this.isExpired(signer, data))
            return false;
        return await this.isCommited(data);
    }
    /**
     * @inheritDoc
     */
    async isCommited(swapData) {
        const data = await this.contract.getHashState("0x" + swapData.getEscrowHash());
        return Number(data.state) === ESCROW_STATE_COMMITTED;
    }
    /**
     * @inheritDoc
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
     * @inheritDoc
     */
    async isRequestRefundable(signer, data) {
        //Swap can only be refunded by the offerer
        if (!data.isOfferer(signer))
            return false;
        if (!(await this.isExpired(signer, data)))
            return false;
        return await this.isCommited(data);
    }
    /**
     * @inheritDoc
     */
    getHashForTxId(txId, confirmations) {
        const chainTxIdHandler = this.claimHandlersBySwapType[base_1.ChainSwapType.CHAIN_TXID];
        if (chainTxIdHandler == null)
            throw new Error("Claim handler for CHAIN_TXID not found!");
        return buffer_1.Buffer.from(chainTxIdHandler.getCommitment({
            txId,
            confirmations,
            btcRelay: this.btcRelay
        }).slice(2), "hex");
    }
    /**
     * @inheritDoc
     */
    getHashForOnchain(outputScript, amount, confirmations, nonce) {
        let result;
        if (nonce == null || nonce === 0n) {
            const chainHandler = this.claimHandlersBySwapType[base_1.ChainSwapType.CHAIN];
            if (chainHandler == null)
                throw new Error("Claim handler for CHAIN not found!");
            result = chainHandler.getCommitment({
                output: outputScript,
                amount,
                confirmations,
                btcRelay: this.btcRelay
            });
        }
        else {
            const chainNoncedHandler = this.claimHandlersBySwapType[base_1.ChainSwapType.CHAIN_NONCED];
            if (chainNoncedHandler == null)
                throw new Error("Claim handler for CHAIN_NONCED not found!");
            result = chainNoncedHandler.getCommitment({
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
     * @inheritDoc
     */
    getHashForHtlc(paymentHash) {
        const htlcHandler = this.claimHandlersBySwapType[base_1.ChainSwapType.HTLC];
        if (htlcHandler == null)
            throw new Error("Claim handler for HTLC not found!");
        return buffer_1.Buffer.from(htlcHandler.getCommitment(paymentHash).slice(2), "hex");
    }
    /**
     * @inheritDoc
     */
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
     * @inheritDoc
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
                    getClaimResult: async () => {
                        const events = await this.Events.getContractBlockEvents(["Claim"], [null, null, "0x" + escrowHash], blockHeight, blockHeight);
                        if (events.length === 0)
                            throw new Error("Claim event not found!");
                        return events[0].args.witnessResult;
                    },
                    getClaimTxId: async () => {
                        const events = await this.Events.getContractBlockEvents(["Claim"], [null, null, "0x" + escrowHash], blockHeight, blockHeight);
                        if (events.length === 0)
                            throw new Error("Claim event not found!");
                        return events[0].transactionHash;
                    }
                };
            case ESCROW_STATE_REFUNDED:
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
                        if (events.length === 0)
                            throw new Error("Refund event not found!");
                        return events[0].transactionHash;
                    }
                };
            default:
                return {
                    type: await this.isExpired(signer, data) ? base_1.SwapCommitStateType.EXPIRED : base_1.SwapCommitStateType.NOT_COMMITED,
                };
        }
    }
    /**
     * @inheritDoc
     */
    async getCommitStatuses(request) {
        const result = {};
        let promises = [];
        //TODO: We can upgrade this to use multicall
        for (let { signer, swapData } of request) {
            promises.push(this.getCommitStatus(signer, swapData).then(val => {
                result[swapData.getEscrowHash()] = val;
            }));
            if (promises.length >= this.Chain.config.maxParallelCalls) {
                await Promise.all(promises);
                promises = [];
            }
        }
        await Promise.all(promises);
        return result;
    }
    async getHistoricalSwaps(signer, startBlockheight) {
        const { height: latestBlockheight } = await this.Chain.getFinalizedBlock();
        const swapsOpened = {};
        const resultingSwaps = {};
        const processor = async (_event) => {
            const escrowHash = _event.args.escrowHash.substring(2);
            if (_event.eventName === "Initialize") {
                const event = _event;
                const claimHandlerHex = event.args.claimHandler;
                const claimHandler = this.claimHandlersByAddress[claimHandlerHex.toLowerCase()];
                if (claimHandler == null) {
                    logger.warn(`getHistoricalSwaps(): Unknown claim handler in tx ${event.transactionHash} with claim handler: ` + claimHandlerHex);
                    return null;
                }
                const txTrace = await this.Chain.Transactions.traceTransaction(event.transactionHash);
                const data = this.findInitSwapData(txTrace, event.args.escrowHash, claimHandler);
                if (data == null) {
                    logger.warn(`getHistoricalSwaps(): Cannot parse swap data from tx ${event.transactionHash} with escrow hash: ` + escrowHash);
                    return null;
                }
                swapsOpened[escrowHash] = {
                    data,
                    getInitTxId: () => Promise.resolve(event.transactionHash),
                    getTxBlock: async () => {
                        return {
                            blockHeight: event.blockNumber,
                            blockTime: await this.Chain.Blocks.getBlockTime(event.blockNumber)
                        };
                    }
                };
            }
            if (_event.eventName === "Claim") {
                const event = _event;
                const foundSwapData = swapsOpened[escrowHash];
                delete swapsOpened[escrowHash];
                resultingSwaps[escrowHash] = {
                    init: foundSwapData,
                    state: {
                        type: base_1.SwapCommitStateType.PAID,
                        getClaimTxId: () => Promise.resolve(event.transactionHash),
                        getClaimResult: () => Promise.resolve(event.args.witnessResult.substring(2)),
                        getTxBlock: async () => {
                            return {
                                blockHeight: event.blockNumber,
                                blockTime: await this.Chain.Blocks.getBlockTime(event.blockNumber)
                            };
                        }
                    }
                };
            }
            if (_event.eventName === "Refund") {
                const event = _event;
                const foundSwapData = swapsOpened[escrowHash];
                delete swapsOpened[escrowHash];
                const isExpired = foundSwapData != null && await this.isExpired(signer, foundSwapData.data);
                resultingSwaps[escrowHash] = {
                    init: foundSwapData,
                    state: {
                        type: isExpired ? base_1.SwapCommitStateType.EXPIRED : base_1.SwapCommitStateType.NOT_COMMITED,
                        getRefundTxId: () => Promise.resolve(event.transactionHash),
                        getTxBlock: async () => {
                            return {
                                blockHeight: event.blockNumber,
                                blockTime: await this.Chain.Blocks.getBlockTime(event.blockNumber)
                            };
                        }
                    }
                };
            }
        };
        //We have to fetch separately the different directions
        await this.Events.findInContractEventsForward(["Initialize", "Claim", "Refund"], [signer, null], processor, startBlockheight);
        await this.Events.findInContractEventsForward(["Initialize", "Claim", "Refund"], [null, signer], processor, startBlockheight);
        logger.debug(`getHistoricalSwaps(): Found ${Object.keys(resultingSwaps).length} settled swaps!`);
        logger.debug(`getHistoricalSwaps(): Found ${Object.keys(swapsOpened).length} unsettled swaps!`);
        for (let escrowHash in swapsOpened) {
            const foundSwapData = swapsOpened[escrowHash];
            resultingSwaps[escrowHash] = {
                init: foundSwapData,
                state: foundSwapData.data.isOfferer(signer) && await this.isExpired(signer, foundSwapData.data)
                    ? { type: base_1.SwapCommitStateType.REFUNDABLE }
                    : { type: base_1.SwapCommitStateType.COMMITED }
            };
        }
        return {
            swaps: resultingSwaps,
            latestBlockheight: latestBlockheight ?? startBlockheight
        };
    }
    ////////////////////////////////////////////
    //// Swap data initializer
    /**
     * @inheritDoc
     */
    createSwapData(type, offerer, claimer, token, amount, paymentHash, sequence, expiry, payIn, payOut, securityDeposit, claimerBounty, depositToken = this.Chain.Tokens.getNativeCurrencyAddress()) {
        const claimHandler = this.claimHandlersBySwapType?.[type];
        if (claimHandler == null)
            throw new Error(`Claim handler unknown for swap type: ${base_1.ChainSwapType[type]}!`);
        return Promise.resolve(new EVMSwapData_1.EVMSwapData(offerer, claimer, token, this.timelockRefundHandler.address, claimHandler.address, payOut, payIn, payIn, //For now track reputation for all payIn swaps
        sequence, "0x" + paymentHash, (0, ethers_1.hexlify)(base_1.BigIntBufferUtils.toBuffer(expiry, "be", 32)), amount, depositToken, securityDeposit, claimerBounty, type));
    }
    findInitSwapData(call, escrowHash, claimHandler) {
        if (call.to.toLowerCase() === this.contractAddress.toLowerCase()) {
            const _result = this.parseCalldata(call.input);
            if (_result != null && _result.name === "initialize") {
                const result = _result;
                //Found, check correct escrow hash
                const [escrowData, signature, timeout, extraData] = result.args;
                const escrow = EVMSwapData_1.EVMSwapData.deserializeFromStruct(escrowData, claimHandler);
                if ("0x" + escrow.getEscrowHash() === escrowHash) {
                    const extraDataHex = (0, ethers_1.hexlify)(extraData);
                    if (extraDataHex.length > 2) {
                        escrow.setExtraData(extraDataHex.substring(2));
                    }
                    return escrow;
                }
            }
        }
        for (let _call of call.calls) {
            const found = this.findInitSwapData(_call, escrowHash, claimHandler);
            if (found != null)
                return found;
        }
        return null;
    }
    ////////////////////////////////////////////
    //// Utils
    /**
     * @inheritDoc
     */
    async getBalance(signer, tokenAddress, inContract) {
        if (inContract)
            return await this.getIntermediaryBalance(signer, tokenAddress);
        return await this.Chain.getBalance(signer, tokenAddress);
    }
    /**
     * @inheritDoc
     */
    getIntermediaryData(address, token) {
        return this.LpVault.getIntermediaryData(address, token);
    }
    /**
     * @inheritDoc
     */
    getIntermediaryReputation(address, token) {
        return this.LpVault.getIntermediaryReputation(address, token);
    }
    getIntermediaryBalance(address, token) {
        return this.LpVault.getIntermediaryBalance(address, token);
    }
    ////////////////////////////////////////////
    //// Transaction initializers
    /**
     * @inheritDoc
     */
    async txsClaimWithSecret(signer, swapData, secret, checkExpiry, initAta, feeRate, skipAtaCheck) {
        return this.Claim.txsClaimWithSecret(typeof (signer) === "string" ? signer : signer.getAddress(), swapData, secret, checkExpiry, feeRate);
    }
    /**
     * @inheritDoc
     */
    async txsClaimWithTxData(signer, swapData, tx, requiredConfirmations, vout, commitedHeader, synchronizer, initAta, feeRate) {
        return this.Claim.txsClaimWithTxData(typeof (signer) === "string" ? signer : signer.getAddress(), swapData, tx, requiredConfirmations, vout, commitedHeader, synchronizer, feeRate);
    }
    /**
     * @inheritDoc
     */
    txsRefund(signer, swapData, check, initAta, feeRate) {
        return this.Refund.txsRefund(signer, swapData, check, feeRate);
    }
    /**
     * @inheritDoc
     */
    txsRefundWithAuthorization(signer, swapData, signature, check, initAta, feeRate) {
        return this.Refund.txsRefundWithAuthorization(signer, swapData, signature.timeout, signature.prefix, signature.signature, check, feeRate);
    }
    /**
     * @inheritDoc
     */
    txsInit(signer, swapData, signature, skipChecks, feeRate) {
        return this.Init.txsInit(signer, swapData, signature.timeout, signature.prefix, signature.signature, skipChecks, feeRate);
    }
    /**
     * @inheritDoc
     */
    txsWithdraw(signer, token, amount, feeRate) {
        return this.LpVault.txsWithdraw(signer, token, amount, feeRate);
    }
    /**
     * @inheritDoc
     */
    txsDeposit(signer, token, amount, feeRate) {
        return this.LpVault.txsDeposit(signer, token, amount, feeRate);
    }
    ////////////////////////////////////////////
    //// Executors
    /**
     * @inheritDoc
     */
    async claimWithSecret(signer, swapData, secret, checkExpiry, initAta, txOptions) {
        const result = await this.Claim.txsClaimWithSecret(signer.getAddress(), swapData, secret, checkExpiry, txOptions?.feeRate);
        const [signature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return signature;
    }
    /**
     * @inheritDoc
     */
    async claimWithTxData(signer, swapData, tx, requiredConfirmations, vout, commitedHeader, synchronizer, initAta, txOptions) {
        const txs = await this.Claim.txsClaimWithTxData(signer.getAddress(), swapData, tx, requiredConfirmations, vout, commitedHeader, synchronizer, txOptions?.feeRate);
        if (txs === null)
            throw new Error("Btc relay not synchronized to required blockheight!");
        const txHashes = await this.Chain.sendAndConfirm(signer, txs, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return txHashes[txHashes.length - 1];
    }
    /**
     * @inheritDoc
     */
    async refund(signer, swapData, check, initAta, txOptions) {
        let result = await this.txsRefund(signer.getAddress(), swapData, check, initAta, txOptions?.feeRate);
        const [signature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return signature;
    }
    /**
     * @inheritDoc
     */
    async refundWithAuthorization(signer, swapData, signature, check, initAta, txOptions) {
        let result = await this.txsRefundWithAuthorization(signer.getAddress(), swapData, signature, check, initAta, txOptions?.feeRate);
        const [txSignature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return txSignature;
    }
    /**
     * @inheritDoc
     */
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
    /**
     * @inheritDoc
     */
    async withdraw(signer, token, amount, txOptions) {
        const txs = await this.LpVault.txsWithdraw(signer.getAddress(), token, amount, txOptions?.feeRate);
        const [txId] = await this.Chain.sendAndConfirm(signer, txs, txOptions?.waitForConfirmation, txOptions?.abortSignal, false);
        return txId;
    }
    /**
     * @inheritDoc
     */
    async deposit(signer, token, amount, txOptions) {
        const txs = await this.LpVault.txsDeposit(signer.getAddress(), token, amount, txOptions?.feeRate);
        const [txId] = await this.Chain.sendAndConfirm(signer, txs, txOptions?.waitForConfirmation, txOptions?.abortSignal, false);
        return txId;
    }
    ////////////////////////////////////////////
    //// Fees
    /**
     * @inheritDoc
     */
    getInitPayInFeeRate(offerer, claimer, token, paymentHash) {
        return this.Chain.Fees.getFeeRate();
    }
    /**
     * @inheritDoc
     */
    getInitFeeRate(offerer, claimer, token, paymentHash) {
        return this.Chain.Fees.getFeeRate();
    }
    /**
     * @inheritDoc
     */
    getRefundFeeRate(swapData) {
        return this.Chain.Fees.getFeeRate();
    }
    /**
     * @inheritDoc
     */
    getClaimFeeRate(signer, swapData) {
        return this.Chain.Fees.getFeeRate();
    }
    /**
     * @inheritDoc
     */
    getClaimFee(signer, swapData, feeRate) {
        return this.Claim.getClaimFee(swapData, feeRate);
    }
    /**
     * @inheritDoc
     */
    getCommitFee(signer, swapData, feeRate) {
        return this.Init.getInitFee(swapData, feeRate);
    }
    /**
     * @inheritDoc
     */
    getRefundFee(signer, swapData, feeRate) {
        return this.Refund.getRefundFee(swapData, feeRate);
    }
}
exports.EVMSwapContract = EVMSwapContract;
