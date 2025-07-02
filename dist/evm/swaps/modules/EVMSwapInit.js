"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSwapInit = void 0;
const base_1 = require("@atomiqlabs/base");
const EVMSwapModule_1 = require("../EVMSwapModule");
const ethers_1 = require("ethers");
const EVMFees_1 = require("../../chain/modules/EVMFees");
const Utils_1 = require("../../../utils/Utils");
const Initialize = [
    { name: "swapHash", type: "bytes32" },
    { name: "offerer", type: "address" },
    { name: "claimer", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "token", type: "address" },
    { name: "payIn", type: "bool" },
    { name: "payOut", type: "bool" },
    { name: "trackingReputation", type: "bool" },
    { name: "claimHandler", type: "address" },
    { name: "claimData", type: "bytes32" },
    { name: "refundHandler", type: "address" },
    { name: "refundData", type: "bytes32" },
    { name: "securityDeposit", type: "uint256" },
    { name: "claimerBounty", type: "uint256" },
    { name: "depositToken", type: "address" },
    { name: "claimActionHash", type: "bytes32" },
    { name: "deadline", type: "uint256" },
    { name: "extraDataHash", type: "bytes32" }
];
class EVMSwapInit extends EVMSwapModule_1.EVMSwapModule {
    /**
     * bare Init action based on the data passed in swapData
     *
     * @param sender
     * @param swapData
     * @param timeout
     * @param signature
     * @param feeRate
     * @private
     */
    async Init(sender, swapData, timeout, signature, feeRate) {
        let value = 0n;
        if (swapData.isToken(this.root.getNativeCurrencyAddress()))
            value += swapData.getAmount();
        if (swapData.isDepositToken(this.root.getNativeCurrencyAddress()))
            value += swapData.getTotalDeposit();
        const tx = await this.swapContract.initialize.populateTransaction(swapData.toEscrowStruct(), signature, timeout, "0x" + swapData.extraData, {
            value
        });
        tx.from = sender;
        EVMFees_1.EVMFees.applyFeeRate(tx, swapData.isPayIn() ? EVMSwapInit.GasCosts.INIT_PAY_IN : EVMSwapInit.GasCosts.INIT, feeRate);
        return tx;
    }
    /**
     * Returns auth prefix to be used with a specific swap, payIn=true & payIn=false use different prefixes (these
     *  actually have no meaning for the smart contract in the EVM case)
     *
     * @param swapData
     * @private
     */
    getAuthPrefix(swapData) {
        return swapData.isPayIn() ? "claim_initialize" : "initialize";
    }
    async preFetchForInitSignatureVerification() {
        return {
            safeBlockTime: await this.root.Blocks.getBlockTime(this.root.config.safeBlockTag)
        };
    }
    /**
     * Signs swap initialization authorization, using data from preFetchedBlockData if provided & still valid (subject
     *  to SIGNATURE_PREFETCH_DATA_VALIDITY)
     *
     * @param signer
     * @param swapData
     * @param authorizationTimeout
     * @public
     */
    async signSwapInitialization(signer, swapData, authorizationTimeout) {
        const authTimeout = Math.floor(Date.now() / 1000) + authorizationTimeout;
        const signature = await this.root.Signatures.signTypedMessage(this.contract.contractAddress, signer, Initialize, "Initialize", {
            "swapHash": "0x" + swapData.getEscrowHash(),
            "offerer": swapData.offerer,
            "claimer": swapData.claimer,
            "amount": swapData.amount,
            "token": swapData.token,
            "payIn": swapData.isPayIn(),
            "payOut": swapData.isPayOut(),
            "trackingReputation": swapData.reputation,
            "claimHandler": swapData.claimHandler,
            "claimData": "0x" + swapData.getClaimHash(),
            "refundHandler": swapData.refundHandler,
            "refundData": swapData.refundData.startsWith("0x") ? swapData.refundData : "0x" + swapData.refundData,
            "securityDeposit": swapData.securityDeposit,
            "claimerBounty": swapData.claimerBounty,
            "depositToken": swapData.depositToken,
            "claimActionHash": ethers_1.ZeroHash,
            "deadline": authorizationTimeout,
            "extraDataHash": (0, ethers_1.keccak256)("0x" + (swapData.extraData ?? ""))
        });
        return {
            prefix: this.getAuthPrefix(swapData),
            timeout: authTimeout.toString(10),
            signature
        };
    }
    /**
     * Checks whether the provided signature data is valid, using preFetchedData if provided and still valid
     *
     * @param sender
     * @param swapData
     * @param timeout
     * @param prefix
     * @param signature
     * @param preFetchData
     * @public
     */
    async isSignatureValid(sender, swapData, timeout, prefix, signature, preFetchData) {
        if (!swapData.isOfferer(sender) && !swapData.isClaimer(sender))
            throw new Error("TX sender not offerer nor claimer");
        const signer = swapData.isOfferer(sender) ? swapData.claimer : swapData.offerer;
        if (await this.contract.isExpired(sender, swapData)) {
            throw new base_1.SignatureVerificationError("Swap will expire too soon!");
        }
        if (prefix !== this.getAuthPrefix(swapData))
            throw new base_1.SignatureVerificationError("Invalid prefix");
        const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
        const timeoutBN = BigInt(timeout);
        const isExpired = (timeoutBN - currentTimestamp) < BigInt(this.contract.authGracePeriod);
        if (isExpired)
            throw new base_1.SignatureVerificationError("Authorization expired!");
        if (await this.isSignatureExpired(timeout, preFetchData))
            throw new base_1.SignatureVerificationError("Authorization expired!");
        const valid = await this.root.Signatures.isValidSignature(this.contract.contractAddress, signature, signer, Initialize, "Initialize", {
            "swapHash": "0x" + swapData.getEscrowHash(),
            "offerer": swapData.offerer,
            "claimer": swapData.claimer,
            "amount": swapData.amount,
            "token": swapData.token,
            "payIn": swapData.isPayIn(),
            "payOut": swapData.isPayOut(),
            "trackingReputation": swapData.reputation,
            "claimHandler": swapData.claimHandler,
            "claimData": "0x" + swapData.getClaimHash(),
            "refundHandler": swapData.refundHandler,
            "refundData": swapData.refundData.startsWith("0x") ? swapData.refundData : "0x" + swapData.refundData,
            "securityDeposit": swapData.securityDeposit,
            "claimerBounty": swapData.claimerBounty,
            "depositToken": swapData.depositToken,
            "claimActionHash": ethers_1.ZeroHash,
            "deadline": timeoutBN,
            "extraDataHash": (0, ethers_1.keccak256)("0x" + (swapData.extraData ?? ""))
        });
        if (!valid)
            throw new base_1.SignatureVerificationError("Invalid signature!");
        return null;
    }
    /**
     * Gets expiry of the provided signature data, this is a minimum of slot expiry & swap signature expiry
     *
     * @param timeout
     * @public
     */
    async getSignatureExpiry(timeout) {
        const now = Date.now();
        const timeoutExpiryTime = (parseInt(timeout) - this.contract.authGracePeriod) * 1000;
        if (timeoutExpiryTime < now)
            return 0;
        return timeoutExpiryTime;
    }
    /**
     * Checks whether signature is expired for good, compares the timestamp to the current "pending" block timestamp
     *
     * @param timeout
     * @param preFetchData
     * @public
     */
    async isSignatureExpired(timeout, preFetchData) {
        if (preFetchData == null || preFetchData.safeBlockTime == null) {
            preFetchData = await this.preFetchForInitSignatureVerification();
        }
        return preFetchData.safeBlockTime > parseInt(timeout);
    }
    /**
     * Creates init transaction with a valid signature from an LP
     *
     * @param sender
     * @param swapData swap to initialize
     * @param timeout init signature timeout
     * @param prefix init signature prefix
     * @param signature init signature
     * @param skipChecks whether to skip signature validity checks
     * @param feeRate fee rate to use for the transaction
     */
    async txsInit(sender, swapData, timeout, prefix, signature, skipChecks, feeRate) {
        var _a;
        if (!skipChecks) {
            const [_, payStatus] = await Promise.all([
                swapData.isOfferer(sender) && !swapData.reputation ? Promise.resolve() : (0, Utils_1.tryWithRetries)(() => this.isSignatureValid(sender, swapData, timeout, prefix, signature), this.retryPolicy, (e) => e instanceof base_1.SignatureVerificationError),
                (0, Utils_1.tryWithRetries)(() => this.contract.getCommitStatus(sender, swapData), this.retryPolicy)
            ]);
            if (payStatus.type !== base_1.SwapCommitStateType.NOT_COMMITED)
                throw new base_1.SwapDataVerificationError("Invoice already being paid for or paid");
        }
        feeRate ?? (feeRate = await this.root.Fees.getFeeRate());
        const txs = [];
        const requiredApprovals = {};
        if (swapData.payIn) {
            if (!swapData.isToken(this.root.getNativeCurrencyAddress())) {
                requiredApprovals[swapData.token.toLowerCase()] = swapData.amount;
            }
        }
        if (swapData.getTotalDeposit() !== 0n) {
            if (!swapData.isDepositToken(this.root.getNativeCurrencyAddress())) {
                requiredApprovals[_a = swapData.depositToken.toLowerCase()] ?? (requiredApprovals[_a] = 0n);
                requiredApprovals[swapData.depositToken.toLowerCase()] += swapData.getTotalDeposit();
            }
        }
        for (let tokenAddress in requiredApprovals) {
            txs.push(await this.root.Tokens.Approve(sender, tokenAddress, requiredApprovals[tokenAddress], this.contract.contractAddress, feeRate));
        }
        txs.push(await this.Init(sender, swapData, BigInt(timeout), signature ?? "0x", feeRate));
        this.logger.debug("txsInitPayIn(): create swap init TX, swap: " + swapData.getClaimHash() +
            " feerate: " + feeRate);
        return txs;
    }
    /**
     * Get the estimated solana fee of the init transaction, this includes the required deposit for creating swap PDA
     *  and also deposit for ATAs
     */
    async getInitFee(swapData, feeRate) {
        feeRate ?? (feeRate = await this.root.Fees.getFeeRate());
        return EVMFees_1.EVMFees.getGasFee(swapData.payIn ? EVMSwapInit.GasCosts.INIT_PAY_IN : EVMSwapInit.GasCosts.INIT, feeRate);
    }
}
exports.EVMSwapInit = EVMSwapInit;
EVMSwapInit.GasCosts = {
    INIT: 100000,
    INIT_PAY_IN: 130000,
};
