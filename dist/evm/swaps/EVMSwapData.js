"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSwapData = void 0;
const base_1 = require("@atomiqlabs/base");
const ethers_1 = require("ethers");
const TimelockRefundHandler_1 = require("./handlers/refund/TimelockRefundHandler");
const FLAG_PAY_OUT = 0x01n;
const FLAG_PAY_IN = 0x02n;
const FLAG_REPUTATION = 0x04n;
class EVMSwapData extends base_1.SwapData {
    static toFlags(val) {
        return {
            sequence: val >> 64n,
            payOut: (val & FLAG_PAY_OUT) === FLAG_PAY_OUT,
            payIn: (val & FLAG_PAY_IN) === FLAG_PAY_IN,
            reputation: (val & FLAG_REPUTATION) === FLAG_REPUTATION
        };
    }
    getFlags() {
        return (this.sequence << 64n) +
            (this.payOut ? FLAG_PAY_OUT : 0n) +
            (this.payIn ? FLAG_PAY_IN : 0n) +
            (this.reputation ? FLAG_REPUTATION : 0n);
    }
    constructor(offererOrData, claimer, token, refundHandler, claimHandler, payOut, payIn, reputation, sequence, claimData, refundData, amount, depositToken, securityDeposit, claimerBounty, kind, extraData, successActionCommitment) {
        super();
        if (claimer != null || token != null || refundHandler != null || claimHandler != null ||
            payOut != null || payIn != null || reputation != null || sequence != null || claimData != null || refundData != null ||
            amount != null || depositToken != null || securityDeposit != null || claimerBounty != null) {
            this.offerer = offererOrData;
            this.claimer = claimer;
            this.token = token;
            this.refundHandler = refundHandler;
            this.claimHandler = claimHandler;
            this.payOut = payOut;
            this.payIn = payIn;
            this.reputation = reputation;
            this.sequence = sequence;
            this.claimData = claimData;
            this.refundData = refundData;
            this.amount = amount;
            this.depositToken = depositToken;
            this.securityDeposit = securityDeposit;
            this.claimerBounty = claimerBounty;
            this.kind = kind;
            this.extraData = extraData;
            this.successActionCommitment = successActionCommitment ?? ethers_1.ZeroHash;
        }
        else {
            this.offerer = offererOrData.offerer;
            this.claimer = offererOrData.claimer;
            this.token = offererOrData.token;
            this.refundHandler = offererOrData.refundHandler;
            this.claimHandler = offererOrData.claimHandler;
            this.payOut = offererOrData.payOut;
            this.payIn = offererOrData.payIn;
            this.reputation = offererOrData.reputation;
            this.sequence = offererOrData.sequence == null ? null : BigInt(offererOrData.sequence);
            this.claimData = offererOrData.claimData;
            this.refundData = offererOrData.refundData;
            this.amount = offererOrData.amount == null ? null : BigInt(offererOrData.amount);
            this.depositToken = offererOrData.depositToken;
            this.securityDeposit = offererOrData.securityDeposit == null ? null : BigInt(offererOrData.securityDeposit);
            this.claimerBounty = offererOrData.claimerBounty == null ? null : BigInt(offererOrData.claimerBounty);
            this.kind = offererOrData.kind;
            this.extraData = offererOrData.extraData;
            this.successActionCommitment = offererOrData.successActionCommitment ?? ethers_1.ZeroHash;
        }
    }
    getOfferer() {
        return this.offerer;
    }
    setOfferer(newOfferer) {
        this.offerer = newOfferer;
        this.payIn = true;
    }
    getClaimer() {
        return this.claimer;
    }
    setClaimer(newClaimer) {
        this.claimer = newClaimer;
        this.payIn = false;
        this.payOut = true;
        this.reputation = false;
    }
    serialize() {
        return {
            type: "evm",
            offerer: this.offerer,
            claimer: this.claimer,
            token: this.token,
            refundHandler: this.refundHandler,
            claimHandler: this.claimHandler,
            payOut: this.payOut,
            payIn: this.payIn,
            reputation: this.reputation,
            sequence: this.sequence == null ? null : this.sequence.toString(10),
            claimData: this.claimData,
            refundData: this.refundData,
            amount: this.amount == null ? null : this.amount.toString(10),
            depositToken: this.depositToken,
            securityDeposit: this.securityDeposit == null ? null : this.securityDeposit.toString(10),
            claimerBounty: this.claimerBounty == null ? null : this.claimerBounty.toString(10),
            kind: this.kind,
            extraData: this.extraData,
            successActionCommitment: this.successActionCommitment
        };
    }
    getAmount() {
        return this.amount;
    }
    getToken() {
        return this.token;
    }
    isToken(token) {
        return this.token.toLowerCase() === token.toLowerCase();
    }
    getType() {
        return this.kind;
    }
    getExpiry() {
        return TimelockRefundHandler_1.TimelockRefundHandler.getExpiry(this);
    }
    isPayIn() {
        return this.payIn;
    }
    isPayOut() {
        return this.payOut;
    }
    getEscrowHash() {
        const encoded = ethers_1.AbiCoder.defaultAbiCoder().encode(["address", "address", "uint256", "address", "uint256", "address", "bytes32", "address", "bytes32", "uint256", "uint256", "address", "bytes32"], [
            this.offerer, this.claimer, this.amount, this.token, this.getFlags(),
            this.claimHandler, this.claimData, this.refundHandler, this.refundData,
            this.securityDeposit, this.claimerBounty, this.depositToken, this.successActionCommitment
        ]);
        let escrowHash = (0, ethers_1.keccak256)(encoded);
        return escrowHash.slice(2); //Strip `0x`
    }
    getClaimHash() {
        let hash = this.claimData;
        if (hash.startsWith("0x"))
            hash = hash.slice(2);
        return hash;
    }
    getSequence() {
        return this.sequence;
    }
    getConfirmationsHint() {
        if (this.extraData == null)
            return null;
        if (this.extraData.length != 84)
            return null;
        return parseInt(this.extraData.slice(80), 16);
    }
    getNonceHint() {
        if (this.extraData == null)
            return null;
        if (this.extraData.length != 84)
            return null;
        return BigInt("0x" + this.extraData.slice(64, 80));
    }
    getTxoHashHint() {
        if (this.extraData == null)
            return null;
        if (this.extraData.length != 84)
            return null;
        return this.extraData.slice(0, 64);
    }
    getExtraData() {
        return this.extraData;
    }
    setExtraData(extraData) {
        this.extraData = extraData;
    }
    getSecurityDeposit() {
        return this.securityDeposit;
    }
    getClaimerBounty() {
        return this.claimerBounty;
    }
    getTotalDeposit() {
        return this.claimerBounty < this.securityDeposit ? this.securityDeposit : this.claimerBounty;
    }
    getDepositToken() {
        return this.depositToken;
    }
    isDepositToken(token) {
        if (!token.startsWith("0x"))
            token = "0x" + token;
        return this.depositToken.toLowerCase() === token.toLowerCase();
    }
    isClaimer(address) {
        if (!address.startsWith("0x"))
            address = "0x" + address;
        return this.claimer.toLowerCase() === address.toLowerCase();
    }
    isOfferer(address) {
        if (!address.startsWith("0x"))
            address = "0x" + address;
        return this.offerer.toLowerCase() === address.toLowerCase();
    }
    isRefundHandler(address) {
        if (!address.startsWith("0x"))
            address = "0x" + address;
        return this.refundHandler.toLowerCase() === address.toLowerCase();
    }
    isClaimHandler(address) {
        if (!address.startsWith("0x"))
            address = "0x" + address;
        return this.claimHandler.toLowerCase() === address.toLowerCase();
    }
    isClaimData(data) {
        if (!data.startsWith("0x"))
            data = "0x" + data;
        return (this.claimData.startsWith("0x") ? this.claimData : "0x" + this.claimData) === data;
    }
    equals(other) {
        return other.offerer.toLowerCase() === this.offerer.toLowerCase() &&
            other.claimer.toLowerCase() === this.claimer.toLowerCase() &&
            other.token.toLowerCase() === this.token.toLowerCase() &&
            other.refundHandler.toLowerCase() === this.refundHandler.toLowerCase() &&
            other.claimHandler.toLowerCase() === this.claimHandler.toLowerCase() &&
            other.payIn === this.payIn &&
            other.payOut === this.payOut &&
            other.reputation === this.reputation &&
            other.sequence === this.sequence &&
            other.claimData.toLowerCase() === this.claimData.toLowerCase() &&
            other.refundData.toLowerCase() === this.refundData.toLowerCase() &&
            other.amount === this.amount &&
            other.securityDeposit === this.securityDeposit &&
            other.claimerBounty === this.claimerBounty &&
            other.successActionCommitment.toLowerCase() === this.successActionCommitment.toLowerCase();
    }
    toEscrowStruct() {
        return {
            offerer: this.offerer,
            claimer: this.claimer,
            token: this.token,
            refundHandler: this.refundHandler,
            claimHandler: this.claimHandler,
            flags: this.getFlags(),
            claimData: this.claimData,
            refundData: this.refundData,
            amount: this.amount,
            depositToken: this.depositToken,
            securityDeposit: this.securityDeposit,
            claimerBounty: this.claimerBounty,
            successActionCommitment: this.successActionCommitment
        };
    }
    hasSuccessAction() {
        return this.successActionCommitment !== ethers_1.ZeroHash;
    }
    static deserializeFromStruct(struct, claimHandlerImpl) {
        const { payOut, payIn, reputation, sequence } = EVMSwapData.toFlags(BigInt(struct.flags));
        return new EVMSwapData(struct.offerer, struct.claimer, struct.token, struct.refundHandler, struct.claimHandler, payOut, payIn, reputation, sequence, (0, ethers_1.hexlify)(struct.claimData), (0, ethers_1.hexlify)(struct.refundData), BigInt(struct.amount), struct.depositToken, BigInt(struct.securityDeposit), BigInt(struct.claimerBounty), claimHandlerImpl.getType(), null, struct.successActionCommitment);
    }
}
exports.EVMSwapData = EVMSwapData;
base_1.SwapData.deserializers["evm"] = EVMSwapData;
