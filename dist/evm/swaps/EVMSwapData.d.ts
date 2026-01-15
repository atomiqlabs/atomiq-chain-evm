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
    getOfferer(): string;
    setOfferer(newOfferer: string): void;
    getClaimer(): string;
    setClaimer(newClaimer: string): void;
    serialize(): any;
    getAmount(): bigint;
    getToken(): string;
    isToken(token: string): boolean;
    getType(): ChainSwapType;
    getExpiry(): bigint;
    isPayIn(): boolean;
    isPayOut(): boolean;
    getEscrowHash(): string;
    getClaimHash(): string;
    getSequence(): bigint;
    getConfirmationsHint(): number | null;
    getNonceHint(): bigint | null;
    getTxoHashHint(): string | null;
    getExtraData(): string | null;
    setExtraData(extraData: string): void;
    getSecurityDeposit(): bigint;
    getClaimerBounty(): bigint;
    getTotalDeposit(): bigint;
    getDepositToken(): string;
    isDepositToken(token: string): boolean;
    isClaimer(address: string): boolean;
    isOfferer(address: string): boolean;
    isRefundHandler(address: string): boolean;
    isClaimHandler(address: string): boolean;
    isClaimData(data: string): boolean;
    equals(other: EVMSwapData): boolean;
    toEscrowStruct(): EscrowDataStruct;
    hasSuccessAction(): boolean;
    static deserializeFromStruct(struct: EscrowDataStruct, claimHandlerImpl: IClaimHandler<any, any>): EVMSwapData;
}
