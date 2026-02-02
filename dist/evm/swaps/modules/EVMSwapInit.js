"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSwapInit = void 0;
const base_1 = require("@atomiqlabs/base");
const EVMSwapModule_1 = require("../EVMSwapModule");
const ethers_1 = require("ethers");
const EVMFees_1 = require("../../chain/modules/EVMFees");
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
        if (swapData.isPayIn()) {
            if (swapData.isOfferer(sender) && swapData.isToken(this.root.getNativeCurrencyAddress()))
                value += swapData.getAmount();
        }
        if (swapData.isDepositToken(this.root.getNativeCurrencyAddress()))
            value += swapData.getTotalDeposit();
        const tx = await this.swapContract.initialize.populateTransaction(swapData.toEscrowStruct(), signature, timeout, "0x" + (swapData.extraData ?? ""), {
            value
        });
        tx.from = sender;
        EVMFees_1.EVMFees.applyFeeRate(tx, this.getInitGas(swapData), feeRate);
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
        const authExpiry = Math.floor(Date.now() / 1000) + authorizationTimeout;
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
            "deadline": authExpiry,
            "extraDataHash": (0, ethers_1.keccak256)("0x" + (swapData.extraData ?? ""))
        });
        return {
            prefix: this.getAuthPrefix(swapData),
            timeout: authExpiry.toString(10),
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
            throw new base_1.SignatureVerificationError("TX sender not offerer nor claimer");
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
        if (swapData.isClaimer(sender) && swapData.isPayIn() &&
            swapData.isToken(this.root.getNativeCurrencyAddress()))
            throw new Error("Cannot initialize as claimer for payIn=true and native currency!");
        if (!skipChecks) {
            const [_, payStatus] = await Promise.all([
                swapData.isOfferer(sender) && !swapData.reputation
                    ? Promise.resolve()
                    : this.isSignatureValid(sender, swapData, timeout, prefix, signature),
                this.contract.getCommitStatus(sender, swapData)
            ]);
            if (payStatus.type !== base_1.SwapCommitStateType.NOT_COMMITED)
                throw new base_1.SwapDataVerificationError("Invoice already being paid for or paid");
        }
        feeRate ?? (feeRate = await this.root.Fees.getFeeRate());
        const txs = [];
        const requiredApprovals = {};
        if (swapData.isPayIn() && swapData.isOfferer(sender)) {
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
        const requiredApprovalTxns = await Promise.all(Object.keys(requiredApprovals).map(token => this.root.Tokens.checkAndGetApproveTx(sender, token, requiredApprovals[token], this.contract.contractAddress, feeRate)));
        requiredApprovalTxns.forEach(tx => tx != null && txs.push(tx));
        txs.push(await this.Init(sender, swapData, BigInt(timeout), signature ?? "0x", feeRate));
        this.logger.debug("txsInitPayIn(): create swap init TX, swap: " + swapData.getClaimHash() +
            " feerate: " + feeRate);
        return txs;
    }
    getInitGas(swapData) {
        let totalGas = EVMSwapInit.GasCosts.BASE;
        if (swapData.isPayIn()) {
            if (!swapData.isToken(this.root.getNativeCurrencyAddress())) {
                totalGas += EVMSwapInit.GasCosts.ERC20_TRANSFER;
            }
        }
        else {
            totalGas += EVMSwapInit.GasCosts.LP_VAULT_TRANSFER;
        }
        if (swapData.getTotalDeposit() > 0) {
            if (!swapData.isPayIn() || !swapData.isDepositToken(swapData.token)) {
                if (!swapData.isDepositToken(this.root.getNativeCurrencyAddress())) {
                    totalGas += EVMSwapInit.GasCosts.ERC20_TRANSFER;
                }
            }
        }
        return totalGas;
    }
    /**
     * Get the estimated fee of the init transaction
     */
    async getInitFee(swapData, feeRate) {
        feeRate ?? (feeRate = await this.root.Fees.getFeeRate());
        let totalFee = EVMFees_1.EVMFees.getGasFee(this.getInitGas(swapData), feeRate);
        if (swapData.isPayIn()) {
            if (!swapData.isToken(this.root.getNativeCurrencyAddress())) {
                totalFee += await this.root.Tokens.getApproveFee(feeRate);
            }
        }
        if (swapData.getTotalDeposit() > 0) {
            if (!swapData.isPayIn() || !swapData.isDepositToken(swapData.token)) {
                if (!swapData.isDepositToken(this.root.getNativeCurrencyAddress())) {
                    totalFee += await this.root.Tokens.getApproveFee(feeRate);
                }
            }
        }
        return totalFee;
    }
}
exports.EVMSwapInit = EVMSwapInit;
EVMSwapInit.GasCosts = {
    BASE: 45000 + 21000,
    ERC20_TRANSFER: 40000,
    LP_VAULT_TRANSFER: 10000
};
