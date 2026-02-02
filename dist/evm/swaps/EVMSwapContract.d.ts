/// <reference types="node" />
/// <reference types="node" />
import { ChainSwapType, IntermediaryReputationType, RelaySynchronizer, SignatureData, SwapCommitState, SwapContract, TransactionConfirmationOptions } from "@atomiqlabs/base";
import { Buffer } from "buffer";
import { IClaimHandler } from "./handlers/claim/ClaimHandlers";
import { IHandler } from "./handlers/IHandler";
import { EVMContractBase } from "../contract/EVMContractBase";
import { EscrowManager } from "./EscrowManagerTypechain";
import { EVMSwapData } from "./EVMSwapData";
import { EVMTx } from "../chain/modules/EVMTransactions";
import { EVMSigner } from "../wallet/EVMSigner";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import { EVMBtcRelay } from "../btcrelay/EVMBtcRelay";
import { EVMBtcStoredHeader } from "../btcrelay/headers/EVMBtcStoredHeader";
import { EVMLpVault } from "./modules/EVMLpVault";
import { EVMPreFetchVerification, EVMSwapInit } from "./modules/EVMSwapInit";
import { EVMSwapRefund } from "./modules/EVMSwapRefund";
import { EVMSwapClaim } from "./modules/EVMSwapClaim";
/**
 * @category Swaps
 */
export declare class EVMSwapContract<ChainId extends string = string> extends EVMContractBase<EscrowManager> implements SwapContract<EVMSwapData, EVMTx, never, EVMPreFetchVerification, EVMSigner, ChainId> {
    readonly supportsInitWithoutClaimer = true;
    readonly chainId: ChainId;
    readonly claimWithSecretTimeout: number;
    readonly claimWithTxDataTimeout: number;
    readonly refundTimeout: number;
    readonly claimGracePeriod: number;
    readonly refundGracePeriod: number;
    readonly authGracePeriod: number;
    readonly Init: EVMSwapInit;
    readonly Refund: EVMSwapRefund;
    readonly Claim: EVMSwapClaim;
    readonly LpVault: EVMLpVault;
    readonly claimHandlersByAddress: {
        [address: string]: IClaimHandler<any, any>;
    };
    readonly claimHandlersBySwapType: {
        [type in ChainSwapType]?: IClaimHandler<any, any>;
    };
    readonly refundHandlersByAddress: {
        [address: string]: IHandler<any, any>;
    };
    readonly timelockRefundHandler: IHandler<any, any>;
    readonly btcRelay: EVMBtcRelay<any>;
    constructor(chainInterface: EVMChainInterface<ChainId>, btcRelay: EVMBtcRelay<any>, contractAddress: string, handlerAddresses: {
        refund: {
            timelock: string;
        };
        claim: {
            [type in ChainSwapType]: string;
        };
    });
    /**
     * @inheritDoc
     */
    start(): Promise<void>;
    /**
     * @inheritDoc
     */
    preFetchForInitSignatureVerification(): Promise<EVMPreFetchVerification>;
    /**
     * @inheritDoc
     */
    getInitSignature(signer: EVMSigner, swapData: EVMSwapData, authorizationTimeout: number, preFetchedBlockData?: never, feeRate?: string): Promise<SignatureData>;
    /**
     * @inheritDoc
     */
    isValidInitAuthorization(sender: string, swapData: EVMSwapData, signature: SignatureData, feeRate?: string, preFetchedData?: EVMPreFetchVerification): Promise<Buffer | null>;
    /**
     * @inheritDoc
     */
    getInitAuthorizationExpiry(swapData: EVMSwapData, signature: SignatureData, preFetchedData?: EVMPreFetchVerification): Promise<number>;
    /**
     * @inheritDoc
     */
    isInitAuthorizationExpired(swapData: EVMSwapData, signature: SignatureData): Promise<boolean>;
    /**
     * @inheritDoc
     */
    getRefundSignature(signer: EVMSigner, swapData: EVMSwapData, authorizationTimeout: number): Promise<SignatureData>;
    /**
     * @inheritDoc
     */
    isValidRefundAuthorization(swapData: EVMSwapData, signature: SignatureData): Promise<Buffer | null>;
    /**
     * @inheritDoc
     */
    getDataSignature(signer: EVMSigner, data: Buffer): Promise<string>;
    /**
     * @inheritDoc
     */
    isValidDataSignature(data: Buffer, signature: string, publicKey: string): Promise<boolean>;
    /**
     * @inheritDoc
     */
    isClaimable(signer: string, data: EVMSwapData): Promise<boolean>;
    /**
     * @inheritDoc
     */
    isCommited(swapData: EVMSwapData): Promise<boolean>;
    /**
     * @inheritDoc
     */
    isExpired(signer: string, data: EVMSwapData): Promise<boolean>;
    /**
     * @inheritDoc
     */
    isRequestRefundable(signer: string, data: EVMSwapData): Promise<boolean>;
    /**
     * @inheritDoc
     */
    getHashForTxId(txId: string, confirmations: number): Buffer;
    /**
     * @inheritDoc
     */
    getHashForOnchain(outputScript: Buffer, amount: bigint, confirmations: number, nonce?: bigint): Buffer;
    /**
     * @inheritDoc
     */
    getHashForHtlc(paymentHash: Buffer): Buffer;
    /**
     * @inheritDoc
     */
    getExtraData(outputScript: Buffer, amount: bigint, confirmations: number, nonce?: bigint): Buffer;
    /**
     * @inheritDoc
     */
    getCommitStatus(signer: string, data: EVMSwapData): Promise<SwapCommitState>;
    /**
     * @inheritDoc
     */
    getCommitStatuses(request: {
        signer: string;
        swapData: EVMSwapData;
    }[]): Promise<{
        [p: string]: SwapCommitState;
    }>;
    /**
     * @inheritDoc
     */
    createSwapData(type: ChainSwapType, offerer: string, claimer: string, token: string, amount: bigint, paymentHash: string, sequence: bigint, expiry: bigint, payIn: boolean, payOut: boolean, securityDeposit: bigint, claimerBounty: bigint, depositToken?: string): Promise<EVMSwapData>;
    /**
     * @inheritDoc
     */
    getBalance(signer: string, tokenAddress: string, inContract?: boolean): Promise<bigint>;
    /**
     * @inheritDoc
     */
    getIntermediaryData(address: string, token: string): Promise<{
        balance: bigint;
        reputation: IntermediaryReputationType;
    }>;
    /**
     * @inheritDoc
     */
    getIntermediaryReputation(address: string, token: string): Promise<IntermediaryReputationType>;
    getIntermediaryBalance(address: string, token: string): Promise<bigint>;
    /**
     * @inheritDoc
     */
    txsClaimWithSecret(signer: string | EVMSigner, swapData: EVMSwapData, secret: string, checkExpiry?: boolean, initAta?: boolean, feeRate?: string, skipAtaCheck?: boolean): Promise<EVMTx[]>;
    /**
     * @inheritDoc
     */
    txsClaimWithTxData(signer: string | EVMSigner, swapData: EVMSwapData, tx: {
        blockhash: string;
        confirmations: number;
        txid: string;
        hex: string;
        height: number;
    }, requiredConfirmations: number, vout: number, commitedHeader?: EVMBtcStoredHeader, synchronizer?: RelaySynchronizer<EVMBtcStoredHeader, EVMTx, any>, initAta?: boolean, feeRate?: string): Promise<EVMTx[]>;
    /**
     * @inheritDoc
     */
    txsRefund(signer: string, swapData: EVMSwapData, check?: boolean, initAta?: boolean, feeRate?: string): Promise<EVMTx[]>;
    /**
     * @inheritDoc
     */
    txsRefundWithAuthorization(signer: string, swapData: EVMSwapData, signature: SignatureData, check?: boolean, initAta?: boolean, feeRate?: string): Promise<EVMTx[]>;
    /**
     * @inheritDoc
     */
    txsInit(signer: string, swapData: EVMSwapData, signature: SignatureData, skipChecks?: boolean, feeRate?: string): Promise<EVMTx[]>;
    /**
     * @inheritDoc
     */
    txsWithdraw(signer: string, token: string, amount: bigint, feeRate?: string): Promise<EVMTx[]>;
    /**
     * @inheritDoc
     */
    txsDeposit(signer: string, token: string, amount: bigint, feeRate?: string): Promise<EVMTx[]>;
    /**
     * @inheritDoc
     */
    claimWithSecret(signer: EVMSigner, swapData: EVMSwapData, secret: string, checkExpiry?: boolean, initAta?: boolean, txOptions?: TransactionConfirmationOptions): Promise<string>;
    /**
     * @inheritDoc
     */
    claimWithTxData(signer: EVMSigner, swapData: EVMSwapData, tx: {
        blockhash: string;
        confirmations: number;
        txid: string;
        hex: string;
        height: number;
    }, requiredConfirmations: number, vout: number, commitedHeader?: EVMBtcStoredHeader, synchronizer?: RelaySynchronizer<EVMBtcStoredHeader, EVMTx, any>, initAta?: boolean, txOptions?: TransactionConfirmationOptions): Promise<string>;
    /**
     * @inheritDoc
     */
    refund(signer: EVMSigner, swapData: EVMSwapData, check?: boolean, initAta?: boolean, txOptions?: TransactionConfirmationOptions): Promise<string>;
    /**
     * @inheritDoc
     */
    refundWithAuthorization(signer: EVMSigner, swapData: EVMSwapData, signature: SignatureData, check?: boolean, initAta?: boolean, txOptions?: TransactionConfirmationOptions): Promise<string>;
    /**
     * @inheritDoc
     */
    init(signer: EVMSigner, swapData: EVMSwapData, signature: SignatureData, skipChecks?: boolean, txOptions?: TransactionConfirmationOptions): Promise<string>;
    /**
     * @inheritDoc
     */
    withdraw(signer: EVMSigner, token: string, amount: bigint, txOptions?: TransactionConfirmationOptions): Promise<string>;
    /**
     * @inheritDoc
     */
    deposit(signer: EVMSigner, token: string, amount: bigint, txOptions?: TransactionConfirmationOptions): Promise<string>;
    /**
     * @inheritDoc
     */
    getInitPayInFeeRate(offerer?: string, claimer?: string, token?: string, paymentHash?: string): Promise<string>;
    /**
     * @inheritDoc
     */
    getInitFeeRate(offerer?: string, claimer?: string, token?: string, paymentHash?: string): Promise<string>;
    /**
     * @inheritDoc
     */
    getRefundFeeRate(swapData: EVMSwapData): Promise<string>;
    /**
     * @inheritDoc
     */
    getClaimFeeRate(signer: string, swapData: EVMSwapData): Promise<string>;
    /**
     * @inheritDoc
     */
    getClaimFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
    /**
     * @inheritDoc
     */
    getCommitFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
    /**
     * @inheritDoc
     */
    getRefundFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
}
