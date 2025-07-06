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
export declare class EVMSwapContract<ChainId extends string = string> extends EVMContractBase<EscrowManager> implements SwapContract<EVMSwapData, EVMTx, never, EVMPreFetchVerification, EVMSigner, ChainId> {
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
    start(): Promise<void>;
    preFetchForInitSignatureVerification(): Promise<EVMPreFetchVerification>;
    getInitSignature(signer: EVMSigner, swapData: EVMSwapData, authorizationTimeout: number, preFetchedBlockData?: never, feeRate?: string): Promise<SignatureData>;
    isValidInitAuthorization(sender: string, swapData: EVMSwapData, { timeout, prefix, signature }: {
        timeout: any;
        prefix: any;
        signature: any;
    }, feeRate?: string, preFetchedData?: EVMPreFetchVerification): Promise<Buffer>;
    getInitAuthorizationExpiry(swapData: EVMSwapData, { timeout, prefix, signature }: {
        timeout: any;
        prefix: any;
        signature: any;
    }, preFetchedData?: EVMPreFetchVerification): Promise<number>;
    isInitAuthorizationExpired(swapData: EVMSwapData, { timeout, prefix, signature }: {
        timeout: any;
        prefix: any;
        signature: any;
    }): Promise<boolean>;
    getRefundSignature(signer: EVMSigner, swapData: EVMSwapData, authorizationTimeout: number): Promise<SignatureData>;
    isValidRefundAuthorization(swapData: EVMSwapData, { timeout, prefix, signature }: {
        timeout: any;
        prefix: any;
        signature: any;
    }): Promise<Buffer>;
    getDataSignature(signer: EVMSigner, data: Buffer): Promise<string>;
    isValidDataSignature(data: Buffer, signature: string, publicKey: string): Promise<boolean>;
    /**
     * Checks whether the claim is claimable by us, that means not expired, we are claimer & the swap is commited
     *
     * @param signer
     * @param data
     */
    isClaimable(signer: string, data: EVMSwapData): Promise<boolean>;
    /**
     * Checks whether a swap is commited, i.e. the swap still exists on-chain and was not claimed nor refunded
     *
     * @param swapData
     */
    isCommited(swapData: EVMSwapData): Promise<boolean>;
    /**
     * Checks whether the swap is expired, takes into consideration possible on-chain time skew, therefore for claimer
     *  the swap expires a bit sooner than it should've & for the offerer it expires a bit later
     *
     * @param signer
     * @param data
     */
    isExpired(signer: string, data: EVMSwapData): Promise<boolean>;
    /**
     * Checks if the swap is refundable by us, checks if we are offerer, if the swap is already expired & if the swap
     *  is still commited
     *
     * @param signer
     * @param data
     */
    isRequestRefundable(signer: string, data: EVMSwapData): Promise<boolean>;
    getHashForTxId(txId: string, confirmations: number): Buffer;
    /**
     * Get the swap payment hash to be used for an on-chain swap, uses poseidon hash of the value
     *
     * @param outputScript output script required to claim the swap
     * @param amount sats sent required to claim the swap
     * @param confirmations
     * @param nonce swap nonce uniquely identifying the transaction to prevent replay attacks
     */
    getHashForOnchain(outputScript: Buffer, amount: bigint, confirmations: number, nonce?: bigint): Buffer;
    /**
     * Get the swap payment hash to be used for a lightning htlc swap, uses poseidon hash of the sha256 hash of the preimage
     *
     * @param paymentHash payment hash of the HTLC
     */
    getHashForHtlc(paymentHash: Buffer): Buffer;
    getExtraData(outputScript: Buffer, amount: bigint, confirmations: number, nonce?: bigint): Buffer;
    /**
     * Gets the status of the specific swap, this also checks if we are offerer/claimer & checks for expiry (to see
     *  if swap is refundable)
     *
     * @param signer
     * @param data
     */
    getCommitStatus(signer: string, data: EVMSwapData): Promise<SwapCommitState>;
    /**
     * Returns the data committed for a specific payment hash, or null if no data is currently commited for
     *  the specific swap
     *
     * @param paymentHashHex
     */
    getCommitedData(paymentHashHex: string): Promise<EVMSwapData>;
    createSwapData(type: ChainSwapType, offerer: string, claimer: string, token: string, amount: bigint, paymentHash: string, sequence: bigint, expiry: bigint, payIn: boolean, payOut: boolean, securityDeposit: bigint, claimerBounty: bigint, depositToken?: string): Promise<EVMSwapData>;
    getBalance(signer: string, tokenAddress: string, inContract?: boolean): Promise<bigint>;
    getIntermediaryData(address: string, token: string): Promise<{
        balance: bigint;
        reputation: IntermediaryReputationType;
    }>;
    getIntermediaryReputation(address: string, token: string): Promise<IntermediaryReputationType>;
    getIntermediaryBalance(address: string, token: string): Promise<bigint>;
    txsClaimWithSecret(signer: string | EVMSigner, swapData: EVMSwapData, secret: string, checkExpiry?: boolean, initAta?: boolean, feeRate?: string, skipAtaCheck?: boolean): Promise<EVMTx[]>;
    txsClaimWithTxData(signer: string | EVMSigner, swapData: EVMSwapData, tx: {
        blockhash: string;
        confirmations: number;
        txid: string;
        hex: string;
        height: number;
    }, requiredConfirmations: number, vout: number, commitedHeader?: EVMBtcStoredHeader, synchronizer?: RelaySynchronizer<EVMBtcStoredHeader, EVMTx, any>, initAta?: boolean, feeRate?: string): Promise<EVMTx[] | null>;
    txsRefund(signer: string, swapData: EVMSwapData, check?: boolean, initAta?: boolean, feeRate?: string): Promise<EVMTx[]>;
    txsRefundWithAuthorization(signer: string, swapData: EVMSwapData, { timeout, prefix, signature }: {
        timeout: any;
        prefix: any;
        signature: any;
    }, check?: boolean, initAta?: boolean, feeRate?: string): Promise<EVMTx[]>;
    txsInit(signer: string, swapData: EVMSwapData, { timeout, prefix, signature }: {
        timeout: any;
        prefix: any;
        signature: any;
    }, skipChecks?: boolean, feeRate?: string): Promise<EVMTx[]>;
    txsWithdraw(signer: string, token: string, amount: bigint, feeRate?: string): Promise<EVMTx[]>;
    txsDeposit(signer: string, token: string, amount: bigint, feeRate?: string): Promise<EVMTx[]>;
    claimWithSecret(signer: EVMSigner, swapData: EVMSwapData, secret: string, checkExpiry?: boolean, initAta?: boolean, txOptions?: TransactionConfirmationOptions): Promise<string>;
    claimWithTxData(signer: EVMSigner, swapData: EVMSwapData, tx: {
        blockhash: string;
        confirmations: number;
        txid: string;
        hex: string;
        height: number;
    }, requiredConfirmations: number, vout: number, commitedHeader?: EVMBtcStoredHeader, synchronizer?: RelaySynchronizer<EVMBtcStoredHeader, EVMTx, any>, initAta?: boolean, txOptions?: TransactionConfirmationOptions): Promise<string>;
    refund(signer: EVMSigner, swapData: EVMSwapData, check?: boolean, initAta?: boolean, txOptions?: TransactionConfirmationOptions): Promise<string>;
    refundWithAuthorization(signer: EVMSigner, swapData: EVMSwapData, signature: SignatureData, check?: boolean, initAta?: boolean, txOptions?: TransactionConfirmationOptions): Promise<string>;
    init(signer: EVMSigner, swapData: EVMSwapData, signature: SignatureData, skipChecks?: boolean, txOptions?: TransactionConfirmationOptions): Promise<string>;
    withdraw(signer: EVMSigner, token: string, amount: bigint, txOptions?: TransactionConfirmationOptions): Promise<string>;
    deposit(signer: EVMSigner, token: string, amount: bigint, txOptions?: TransactionConfirmationOptions): Promise<string>;
    getInitPayInFeeRate(offerer?: string, claimer?: string, token?: string, paymentHash?: string): Promise<string>;
    getInitFeeRate(offerer?: string, claimer?: string, token?: string, paymentHash?: string): Promise<string>;
    getRefundFeeRate(swapData: EVMSwapData): Promise<string>;
    getClaimFeeRate(signer: string, swapData: EVMSwapData): Promise<string>;
    getClaimFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
    /**
     * Get the estimated fee of the commit transaction
     */
    getCommitFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
    /**
     * Get the estimated transaction fee of the refund transaction
     */
    getRefundFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
}
