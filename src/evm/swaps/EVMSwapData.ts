import {SwapData, ChainSwapType} from "@atomiqlabs/base";
import {AbiCoder, hexlify, keccak256, ZeroHash} from "ethers";
import {EscrowDataStruct, EscrowDataStructOutput} from "./EscrowManagerTypechain";
import {IClaimHandler} from "./handlers/claim/ClaimHandlers";
import {TimelockRefundHandler} from "./handlers/refund/TimelockRefundHandler";

const FLAG_PAY_OUT: bigint = 0x01n;
const FLAG_PAY_IN: bigint = 0x02n;
const FLAG_REPUTATION: bigint = 0x04n;

export class EVMSwapData extends SwapData {

    static toFlags(val: bigint): {payOut: boolean, payIn: boolean, reputation: boolean, sequence: bigint} {
        return {
            sequence: val >> 64n,
            payOut: (val & FLAG_PAY_OUT) === FLAG_PAY_OUT,
            payIn: (val & FLAG_PAY_IN) === FLAG_PAY_IN,
            reputation: (val & FLAG_REPUTATION) === FLAG_REPUTATION
        }
    }

    private getFlags(): bigint {
        return (this.sequence << 64n) +
            (this.payOut ? FLAG_PAY_OUT : 0n) +
            (this.payIn ? FLAG_PAY_IN : 0n) +
            (this.reputation ? FLAG_REPUTATION : 0n);
    }

    offerer: string;
    claimer: string;
    token: string;

    refundHandler: string;
    claimHandler: string;

    //Flags
    payOut: boolean;
    payIn: boolean;
    reputation: boolean;
    sequence: bigint;

    claimData: string;
    refundData: string;

    amount: bigint;

    depositToken: string;
    securityDeposit: bigint;
    claimerBounty: bigint;

    extraData: string;

    kind: ChainSwapType;

    constructor(
        offerer: string,
        claimer: string,
        token: string,
        refundHandler: string,
        claimHandler: string,
        payOut: boolean,
        payIn: boolean,
        reputation: boolean,
        sequence: bigint,
        claimData: string,
        refundData: string,
        amount: bigint,
        depositToken: string,
        securityDeposit: bigint,
        claimerBounty: bigint,
        kind: ChainSwapType,
        extraData: string
    );

    constructor(data: any);

    constructor(
        offererOrData: string | any,
        claimer?: string,
        token?: string,
        refundHandler?: string,
        claimHandler?: string,
        payOut?: boolean,
        payIn?: boolean,
        reputation?: boolean,
        sequence?: bigint,
        claimData?: string,
        refundData?: string,
        amount?: bigint,
        depositToken?: string,
        securityDeposit?: bigint,
        claimerBounty?: bigint,
        kind?: ChainSwapType,
        extraData?: string
    ) {
        super();
        if(claimer!=null || token!=null || refundHandler!=null || claimHandler!=null ||
            payOut!=null || payIn!=null || reputation!=null || sequence!=null || claimData!=null || refundData!=null ||
            amount!=null || depositToken!=null || securityDeposit!=null || claimerBounty!=null) {
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
        } else {
            this.offerer = offererOrData.offerer;
            this.claimer = offererOrData.claimer;
            this.token = offererOrData.token;
            this.refundHandler = offererOrData.refundHandler;
            this.claimHandler = offererOrData.claimHandler;
            this.payOut = offererOrData.payOut;
            this.payIn = offererOrData.payIn;
            this.reputation = offererOrData.reputation;
            this.sequence = offererOrData.sequence==null ? null : BigInt(offererOrData.sequence);
            this.claimData = offererOrData.claimData;
            this.refundData = offererOrData.refundData;
            this.amount = offererOrData.amount==null ? null : BigInt(offererOrData.amount);
            this.depositToken = offererOrData.depositToken;
            this.securityDeposit = offererOrData.securityDeposit==null ? null : BigInt(offererOrData.securityDeposit);
            this.claimerBounty = offererOrData.claimerBounty==null ? null : BigInt(offererOrData.claimerBounty);
            this.kind = offererOrData.kind;
            this.extraData = offererOrData.extraData;
        }
    }

    getOfferer(): string {
        return this.offerer;
    }

    setOfferer(newOfferer: string) {
        this.offerer = newOfferer;
        this.payIn = true;
    }

    getClaimer(): string {
        return this.claimer;
    }

    setClaimer(newClaimer: string) {
        this.claimer = newClaimer;
        this.payIn = false;
        this.payOut = true;
        this.reputation = false;
    }

    serialize(): any {
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
            sequence: this.sequence==null ? null : this.sequence.toString(10),
            claimData: this.claimData,
            refundData: this.refundData,
            amount: this.amount==null ? null : this.amount.toString(10),
            depositToken: this.depositToken,
            securityDeposit: this.securityDeposit==null ? null : this.securityDeposit.toString(10),
            claimerBounty: this.claimerBounty==null ? null : this.claimerBounty.toString(10),
            kind: this.kind,
            extraData: this.extraData
        }
    }

    getAmount(): bigint {
        return this.amount;
    }

    getToken(): string {
        return this.token;
    }

    isToken(token: string): boolean {
        return this.token.toLowerCase()===token.toLowerCase();
    }

    getType(): ChainSwapType {
        return this.kind;
    }

    getExpiry(): bigint {
        return TimelockRefundHandler.getExpiry(this);
    }

    isPayIn(): boolean {
        return this.payIn;
    }

    isPayOut(): boolean {
        return this.payOut;
    }

    getEscrowHash(): string {
        const encoded = AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint256", "address", "uint256", "address", "bytes32", "address", "bytes32", "uint256", "uint256", "address", "bytes32"],
            [
                this.offerer, this.claimer, this.amount, this.token, this.getFlags(),
                this.claimHandler, this.claimData, this.refundHandler, this.refundData,
                this.securityDeposit, this.claimerBounty, this.depositToken, ZeroHash
            ]
        )
        let escrowHash = keccak256(encoded);
        return escrowHash.slice(2); //Strip `0x`
   }

    getClaimHash(): string {
        let hash = this.claimData;
        if(hash.startsWith("0x")) hash = hash.slice(2);
        return hash;
    }

    getSequence(): bigint {
        return this.sequence;
    }

    getConfirmationsHint(): number {
        if(this.extraData==null) return null;
        if(this.extraData.length!=84) return null;
        return parseInt(this.extraData.slice(80), 16);
    }

    getNonceHint(): bigint {
        if(this.extraData==null) return null;
        if(this.extraData.length!=84) return null;
        return BigInt("0x"+this.extraData.slice(64, 80));
    }

    getTxoHashHint(): string {
        if(this.extraData==null) return null;
        if(this.extraData.length!=84) return null;
        return this.extraData.slice(0, 64);
    }

    getExtraData(): string {
        return this.extraData;
    }

    setExtraData(extraData: string): void {
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

    isDepositToken(token: string): boolean {
        if(!token.startsWith("0x")) token = "0x"+token;
        return this.depositToken.toLowerCase() === token.toLowerCase();
    }

    isClaimer(address: string) {
        if(!address.startsWith("0x")) address = "0x"+address;
        return this.claimer.toLowerCase() === address.toLowerCase();
    }

    isOfferer(address: string) {
        if(!address.startsWith("0x")) address = "0x"+address;
        return this.offerer.toLowerCase() === address.toLowerCase();
    }

    isRefundHandler(address: string): boolean {
        if(!address.startsWith("0x")) address = "0x"+address;
        return this.refundHandler.toLowerCase() === address.toLowerCase();
    }

    isClaimHandler(address: string): boolean {
        if(!address.startsWith("0x")) address = "0x"+address;
        return this.claimHandler.toLowerCase() === address.toLowerCase();
    }

    isClaimData(data: string): boolean {
        if(!data.startsWith("0x")) data = "0x"+data;
        return (this.claimData.startsWith("0x") ? this.claimData : "0x"+this.claimData) === data;
    }

    equals(other: EVMSwapData): boolean {
        return other.offerer.toLowerCase()===this.offerer.toLowerCase() &&
            other.claimer.toLowerCase()===this.claimer.toLowerCase() &&
            other.token.toLowerCase()===this.token.toLowerCase() &&
            other.refundHandler.toLowerCase()===this.refundHandler.toLowerCase() &&
            other.claimHandler.toLowerCase()===this.claimHandler.toLowerCase() &&
            other.payIn===this.payIn &&
            other.payOut===this.payOut &&
            other.reputation===this.reputation &&
            this.sequence === other.sequence &&
            other.claimData.toLowerCase()===this.claimData.toLowerCase() &&
            other.refundData.toLowerCase()===this.refundData.toLowerCase() &&
            other.amount === this.amount &&
            other.securityDeposit === this.securityDeposit &&
            other.claimerBounty === this.claimerBounty
    }

    toEscrowStruct(): EscrowDataStruct {
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
            successActionCommitment: ZeroHash //For now enforce no success action
        }
    }

    static deserializeFromStruct(struct: EscrowDataStruct, claimHandlerImpl: IClaimHandler<any, any>): EVMSwapData {
        const {payOut, payIn, reputation, sequence} = EVMSwapData.toFlags(BigInt(struct.flags));

        // if(struct.successActionCommitment !== ZeroHash) throw new Error("Success action not allowed!");

        return new EVMSwapData(
            struct.offerer as string,
            struct.claimer as string,
            struct.token as string,
            struct.refundHandler as string,
            struct.claimHandler as string,
            payOut,
            payIn,
            reputation,
            sequence,
            hexlify(struct.claimData),
            hexlify(struct.refundData),
            BigInt(struct.amount),
            struct.depositToken as string,
            BigInt(struct.securityDeposit),
            BigInt(struct.claimerBounty),
            claimHandlerImpl.getType(),
            null
        );
    }

}

SwapData.deserializers["evm"] = EVMSwapData;
