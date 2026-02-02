import { SwapData, ChainSwapType } from "@atomiqlabs/base";
import { EscrowDataStruct } from "./EscrowManagerTypechain";
import { IClaimHandler } from "./handlers/claim/ClaimHandlers";
/**
 * @category Swaps
 */
export declare class EVMSwapData extends SwapData {
    static toFlags(val: bigint): {
        payOut: boolean;
        payIn: boolean;
        reputation: boolean;
        sequence: bigint;
    };
    private getFlags;
    offerer: string;
    claimer: string;
    token: string;
    refundHandler: string;
    claimHandler: string;
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
    extraData?: string;
    successActionCommitment: string;
    kind: ChainSwapType;
    constructor(offerer: string, claimer: string, token: string, refundHandler: string, claimHandler: string, payOut: boolean, payIn: boolean, reputation: boolean, sequence: bigint, claimData: string, refundData: string, amount: bigint, depositToken: string, securityDeposit: bigint, claimerBounty: bigint, kind: ChainSwapType, extraData?: string, successActionCommitment?: string);
    constructor(data: any);
    /**
     * @inheritDoc
     */
    getOfferer(): string;
    /**
     * @inheritDoc
     */
    setOfferer(newOfferer: string): void;
    /**
     * @inheritDoc
     */
    getClaimer(): string;
    /**
     * @inheritDoc
     */
    setClaimer(newClaimer: string): void;
    /**
     * @inheritDoc
     */
    serialize(): any;
    /**
     * @inheritDoc
     */
    getAmount(): bigint;
    /**
     * @inheritDoc
     */
    getToken(): string;
    /**
     * @inheritDoc
     */
    isToken(token: string): boolean;
    /**
     * @inheritDoc
     */
    getType(): ChainSwapType;
    /**
     * @inheritDoc
     */
    getExpiry(): bigint;
    /**
     * @inheritDoc
     */
    isPayIn(): boolean;
    /**
     * @inheritDoc
     */
    isPayOut(): boolean;
    /**
     * @inheritDoc
     */
    isTrackingReputation(): boolean;
    /**
     * @inheritDoc
     */
    getEscrowHash(): string;
    /**
     * @inheritDoc
     */
    getClaimHash(): string;
    /**
     * @inheritDoc
     */
    getSequence(): bigint;
    /**
     * @inheritDoc
     */
    getConfirmationsHint(): number | null;
    /**
     * @inheritDoc
     */
    getNonceHint(): bigint | null;
    /**
     * @inheritDoc
     */
    getTxoHashHint(): string | null;
    /**
     * @inheritDoc
     */
    getExtraData(): string | null;
    /**
     * @inheritDoc
     */
    setExtraData(extraData: string): void;
    /**
     * @inheritDoc
     */
    getSecurityDeposit(): bigint;
    /**
     * @inheritDoc
     */
    getClaimerBounty(): bigint;
    /**
     * @inheritDoc
     */
    getTotalDeposit(): bigint;
    /**
     * @inheritDoc
     */
    getDepositToken(): string;
    /**
     * @inheritDoc
     */
    isDepositToken(token: string): boolean;
    /**
     * @inheritDoc
     */
    isClaimer(address: string): boolean;
    /**
     * @inheritDoc
     */
    isOfferer(address: string): boolean;
    isRefundHandler(address: string): boolean;
    isClaimHandler(address: string): boolean;
    isClaimData(data: string): boolean;
    /**
     * @inheritDoc
     */
    equals(other: EVMSwapData): boolean;
    toEscrowStruct(): EscrowDataStruct;
    /**
     * @inheritDoc
     */
    hasSuccessAction(): boolean;
    static deserializeFromStruct(struct: EscrowDataStruct, claimHandlerImpl: IClaimHandler<any, any>): EVMSwapData;
}
