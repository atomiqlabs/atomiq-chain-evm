import {
    BigIntBufferUtils,
    ChainSwapType,
    IntermediaryReputationType,
    RelaySynchronizer,
    SignatureData, SwapCommitState, SwapCommitStateType,
    SwapContract,
    TransactionConfirmationOptions
} from "@atomiqlabs/base";
import {Buffer} from "buffer";
import {TimelockRefundHandler} from "./handlers/refund/TimelockRefundHandler";
import {claimHandlersList, IClaimHandler} from "./handlers/claim/ClaimHandlers"
import {IHandler} from "./handlers/IHandler";
import {sha256} from "@noble/hashes/sha2";
import { EVMContractBase } from "../contract/EVMContractBase";
import {EscrowManager} from "./EscrowManagerTypechain";
import { EVMSwapData } from "./EVMSwapData";
import {EVMTx} from "../chain/modules/EVMTransactions";
import { EVMSigner } from "../wallet/EVMSigner";
import {EVMChainInterface} from "../chain/EVMChainInterface";
import { EVMBtcRelay } from "../btcrelay/EVMBtcRelay";
import {EscrowManagerAbi} from "./EscrowManagerAbi";
import {hexlify} from "ethers";
import {EVMBtcStoredHeader} from "../btcrelay/headers/EVMBtcStoredHeader";
import {EVMLpVault} from "./modules/EVMLpVault";
import {EVMPreFetchVerification, EVMSwapInit} from "./modules/EVMSwapInit";
import { EVMSwapRefund } from "./modules/EVMSwapRefund";
import {EVMSwapClaim} from "./modules/EVMSwapClaim";

const ESCROW_STATE_COMMITTED = 1;
const ESCROW_STATE_CLAIMED = 2;
const ESCROW_STATE_REFUNDED = 3;

export class EVMSwapContract<ChainId extends string = string>
    extends EVMContractBase<EscrowManager>
    implements SwapContract<
        EVMSwapData,
        EVMTx,
        never,
        EVMPreFetchVerification,
        EVMSigner,
        ChainId
    > {

    readonly supportsInitWithoutClaimer = true;

    ////////////////////////
    //// Constants
    readonly chainId: ChainId;

    ////////////////////////
    //// Timeouts
    readonly claimWithSecretTimeout: number = 180;
    readonly claimWithTxDataTimeout: number = 180;
    readonly refundTimeout: number = 180;
    readonly claimGracePeriod: number = 10*60;
    readonly refundGracePeriod: number = 10*60;
    readonly authGracePeriod: number = 30;

    ////////////////////////
    //// Services
    readonly Init: EVMSwapInit;
    readonly Refund: EVMSwapRefund;
    readonly Claim: EVMSwapClaim;
    readonly LpVault: EVMLpVault;

    ////////////////////////
    //// Handlers
    readonly claimHandlersByAddress: {[address: string]: IClaimHandler<any, any>} = {};
    readonly claimHandlersBySwapType: {[type in ChainSwapType]?: IClaimHandler<any, any>} = {};

    readonly refundHandlersByAddress: {[address: string]: IHandler<any, any>} = {};
    readonly timelockRefundHandler: IHandler<any, any>;

    readonly btcRelay: EVMBtcRelay<any>;

    constructor(
        chainInterface: EVMChainInterface<ChainId>,
        btcRelay: EVMBtcRelay<any>,
        contractAddress: string,
        handlerAddresses: {
            refund: {
                timelock: string
            },
            claim: {
                [type in ChainSwapType]: string
            }
        }
    ) {
        super(chainInterface, contractAddress, EscrowManagerAbi);
        this.chainId = chainInterface.chainId;
        this.Init = new EVMSwapInit(chainInterface, this);
        this.Refund = new EVMSwapRefund(chainInterface, this);
        this.Claim = new EVMSwapClaim(chainInterface, this);
        this.LpVault = new EVMLpVault(chainInterface, this);

        this.btcRelay = btcRelay;

        claimHandlersList.forEach(handlerCtor => {
            const handler = new handlerCtor(handlerAddresses.claim[handlerCtor.type]);
            this.claimHandlersByAddress[handler.address.toLowerCase()] = handler;
            this.claimHandlersBySwapType[handlerCtor.type] = handler;
        });

        this.timelockRefundHandler = new TimelockRefundHandler(handlerAddresses.refund.timelock);
        this.refundHandlersByAddress[this.timelockRefundHandler.address.toLowerCase()] = this.timelockRefundHandler;
    }

    async start(): Promise<void> {
    }

    ////////////////////////////////////////////
    //// Signatures
    preFetchForInitSignatureVerification(): Promise<EVMPreFetchVerification> {
        return this.Init.preFetchForInitSignatureVerification();
    }

    getInitSignature(signer: EVMSigner, swapData: EVMSwapData, authorizationTimeout: number, preFetchedBlockData?: never, feeRate?: string): Promise<SignatureData> {
        return this.Init.signSwapInitialization(signer, swapData, authorizationTimeout);
    }

    isValidInitAuthorization(sender: string, swapData: EVMSwapData, signature: SignatureData, feeRate?: string, preFetchedData?: EVMPreFetchVerification): Promise<Buffer | null> {
        return this.Init.isSignatureValid(sender, swapData, signature.timeout, signature.prefix, signature.signature, preFetchedData);
    }

    getInitAuthorizationExpiry(swapData: EVMSwapData, signature: SignatureData, preFetchedData?: EVMPreFetchVerification): Promise<number> {
        return this.Init.getSignatureExpiry(signature.timeout);
    }

    isInitAuthorizationExpired(swapData: EVMSwapData, signature: SignatureData): Promise<boolean> {
        return this.Init.isSignatureExpired(signature.timeout);
    }

    getRefundSignature(signer: EVMSigner, swapData: EVMSwapData, authorizationTimeout: number): Promise<SignatureData> {
        return this.Refund.signSwapRefund(signer, swapData, authorizationTimeout);
    }

    isValidRefundAuthorization(swapData: EVMSwapData, signature: SignatureData): Promise<Buffer |  null> {
        return this.Refund.isSignatureValid(swapData, signature.timeout, signature.prefix, signature.signature);
    }

    getDataSignature(signer: EVMSigner, data: Buffer): Promise<string> {
        return this.Chain.Signatures.getDataSignature(signer, data);
    }

    isValidDataSignature(data: Buffer, signature: string, publicKey: string): Promise<boolean> {
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
    async isClaimable(signer: string, data: EVMSwapData): Promise<boolean> {
        if(!data.isClaimer(signer)) return false;
        if(await this.isExpired(signer, data)) return false;
        return await this.isCommited(data);
    }

    /**
     * Checks whether a swap is commited, i.e. the swap still exists on-chain and was not claimed nor refunded
     *
     * @param swapData
     */
    async isCommited(swapData: EVMSwapData): Promise<boolean> {
        const data = await this.contract.getHashState("0x"+swapData.getEscrowHash());
        return Number(data.state)===ESCROW_STATE_COMMITTED;
    }

    /**
     * Checks whether the swap is expired, takes into consideration possible on-chain time skew, therefore for claimer
     *  the swap expires a bit sooner than it should've & for the offerer it expires a bit later
     *
     * @param signer
     * @param data
     */
    isExpired(signer: string, data: EVMSwapData): Promise<boolean> {
        let currentTimestamp: bigint = BigInt(Math.floor(Date.now()/1000));
        if(data.isClaimer(signer)) currentTimestamp = currentTimestamp + BigInt(this.claimGracePeriod);
        if(data.isOfferer(signer)) currentTimestamp = currentTimestamp - BigInt(this.refundGracePeriod);
        return Promise.resolve(data.getExpiry() < currentTimestamp);
    }

    /**
     * Checks if the swap is refundable by us, checks if we are offerer, if the swap is already expired & if the swap
     *  is still commited
     *
     * @param signer
     * @param data
     */
    async isRequestRefundable(signer: string, data: EVMSwapData): Promise<boolean> {
        //Swap can only be refunded by the offerer
        if(!data.isOfferer(signer)) return false;
        if(!(await this.isExpired(signer, data))) return false;
        return await this.isCommited(data);
    }

    getHashForTxId(txId: string, confirmations: number) {
        const chainTxIdHandler = this.claimHandlersBySwapType[ChainSwapType.CHAIN_TXID];
        if(chainTxIdHandler==null) throw new Error("Claim handler for CHAIN_TXID not found!");
        return Buffer.from(chainTxIdHandler.getCommitment({
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
    getHashForOnchain(outputScript: Buffer, amount: bigint, confirmations: number, nonce?: bigint): Buffer {
        let result: string;
        if(nonce==null || nonce === 0n) {
            const chainHandler = this.claimHandlersBySwapType[ChainSwapType.CHAIN];
            if(chainHandler==null) throw new Error("Claim handler for CHAIN not found!");
            result = chainHandler.getCommitment({
                output: outputScript,
                amount,
                confirmations,
                btcRelay: this.btcRelay
            });
        } else {
            const chainNoncedHandler = this.claimHandlersBySwapType[ChainSwapType.CHAIN_NONCED];
            if(chainNoncedHandler==null) throw new Error("Claim handler for CHAIN_NONCED not found!");
            result = chainNoncedHandler.getCommitment({
                output: outputScript,
                amount,
                nonce,
                confirmations,
                btcRelay: this.btcRelay
            });
        }
        return Buffer.from(result.slice(2), "hex");
    }

    /**
     * Get the swap payment hash to be used for a lightning htlc swap, uses poseidon hash of the sha256 hash of the preimage
     *
     * @param paymentHash payment hash of the HTLC
     */
    getHashForHtlc(paymentHash: Buffer): Buffer {
        const htlcHandler = this.claimHandlersBySwapType[ChainSwapType.HTLC];
        if(htlcHandler==null) throw new Error("Claim handler for HTLC not found!");
        return Buffer.from(htlcHandler.getCommitment(paymentHash).slice(2), "hex");
    }

    getExtraData(outputScript: Buffer, amount: bigint, confirmations: number, nonce?: bigint): Buffer {
        if(nonce==null) nonce = 0n;
        const txoHash = Buffer.from(sha256(Buffer.concat([
            BigIntBufferUtils.toBuffer(amount, "le", 8),
            outputScript
        ])));
        return Buffer.concat([
            txoHash,
            BigIntBufferUtils.toBuffer(nonce, "be", 8),
            BigIntBufferUtils.toBuffer(BigInt(confirmations), "be", 2)
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
    async getCommitStatus(signer: string, data: EVMSwapData): Promise<SwapCommitState> {
        const escrowHash = data.getEscrowHash();
        const stateData = await this.contract.getHashState("0x"+escrowHash);
        const state = Number(stateData.state);
        const blockHeight = Number(stateData.finishBlockheight);
        switch(state) {
            case ESCROW_STATE_COMMITTED:
                if(data.isOfferer(signer) && await this.isExpired(signer,data)) return {type: SwapCommitStateType.REFUNDABLE};
                return {type: SwapCommitStateType.COMMITED};
            case ESCROW_STATE_CLAIMED:
                return {
                    type: SwapCommitStateType.PAID,
                    getTxBlock: async () => {
                        return {
                            blockTime: await this.Chain.Blocks.getBlockTime(blockHeight),
                            blockHeight: blockHeight
                        };
                    },
                    getClaimResult: async () => {
                        const events = await this.Events.getContractBlockEvents(
                            ["Claim"],
                            [null, null, "0x"+escrowHash],
                            blockHeight, blockHeight
                        );
                        if(events.length===0) throw new Error("Claim event not found!");
                        return events[0].args.witnessResult;
                    },
                    getClaimTxId: async () => {
                        const events = await this.Events.getContractBlockEvents(
                            ["Claim"],
                            [null, null, "0x"+escrowHash],
                            blockHeight, blockHeight
                        );
                        if(events.length===0) throw new Error("Claim event not found!");
                        return events[0].transactionHash;
                    }
                };
            default:
                return {
                    type: await this.isExpired(signer, data) ? SwapCommitStateType.EXPIRED : SwapCommitStateType.NOT_COMMITED,
                    getTxBlock: async () => {
                        return {
                            blockTime: await this.Chain.Blocks.getBlockTime(blockHeight),
                            blockHeight: blockHeight
                        };
                    },
                    getRefundTxId: async () => {
                        const events = await this.Events.getContractBlockEvents(
                            ["Refund"],
                            [null, null, "0x"+escrowHash],
                            blockHeight, blockHeight
                        );
                        if(events.length===0) throw new Error("Refund event not found!");
                        return events[0].transactionHash;
                    }
                };
        }
    }

    async getCommitStatuses(request: { signer: string; swapData: EVMSwapData }[]): Promise<{
        [p: string]: SwapCommitState
    }> {
        const result: {
            [p: string]: SwapCommitState
        } = {};
        let promises: Promise<void>[] = [];
        //TODO: We can upgrade this to use multicall
        for(let {signer, swapData} of request) {
            promises.push(this.getCommitStatus(signer, swapData).then(val => {
                result[swapData.getEscrowHash()] = val;
            }));
            if(promises.length>=this.Chain.config.maxParallelCalls) {
                await Promise.all(promises);
                promises = [];
            }
        }
        await Promise.all(promises);
        return result;
    }

    ////////////////////////////////////////////
    //// Swap data initializer
    createSwapData(
        type: ChainSwapType,
        offerer: string,
        claimer: string,
        token: string,
        amount: bigint,
        paymentHash: string,
        sequence: bigint,
        expiry: bigint,
        payIn: boolean,
        payOut: boolean,
        securityDeposit: bigint,
        claimerBounty: bigint,
        depositToken: string = this.Chain.Tokens.getNativeCurrencyAddress()
    ): Promise<EVMSwapData> {
        const claimHandler = this.claimHandlersBySwapType?.[type];
        if(claimHandler==null) throw new Error(`Claim handler unknown for swap type: ${ChainSwapType[type]}!`);

        return Promise.resolve(new EVMSwapData(
            offerer,
            claimer,
            token,
            this.timelockRefundHandler.address,
            claimHandler.address,
            payOut,
            payIn,
            payIn, //For now track reputation for all payIn swaps
            sequence,
            "0x"+paymentHash,
            hexlify(BigIntBufferUtils.toBuffer(expiry, "be", 32)),
            amount,
            depositToken,
            securityDeposit,
            claimerBounty,
            type
        ));
    }

    ////////////////////////////////////////////
    //// Utils
    async getBalance(signer: string, tokenAddress: string, inContract?: boolean): Promise<bigint> {
        if(inContract) return await this.getIntermediaryBalance(signer, tokenAddress);

        return await this.Chain.getBalance(signer, tokenAddress);
    }

    getIntermediaryData(address: string, token: string): Promise<{
        balance: bigint,
        reputation: IntermediaryReputationType
    }> {
        return this.LpVault.getIntermediaryData(address, token);
    }

    getIntermediaryReputation(address: string, token: string): Promise<IntermediaryReputationType> {
        return this.LpVault.getIntermediaryReputation(address, token);
    }

    getIntermediaryBalance(address: string, token: string): Promise<bigint> {
        return this.LpVault.getIntermediaryBalance(address, token);
    }

    ////////////////////////////////////////////
    //// Transaction initializers
    async txsClaimWithSecret(
        signer: string | EVMSigner,
        swapData: EVMSwapData,
        secret: string,
        checkExpiry?: boolean,
        initAta?: boolean,
        feeRate?: string,
        skipAtaCheck?: boolean
    ): Promise<EVMTx[]> {
        return this.Claim.txsClaimWithSecret(typeof(signer)==="string" ? signer : signer.getAddress(), swapData, secret, checkExpiry, feeRate)
    }

    async txsClaimWithTxData(
        signer: string | EVMSigner,
        swapData: EVMSwapData,
        tx: { blockhash: string, confirmations: number, txid: string, hex: string, height: number },
        requiredConfirmations: number,
        vout: number,
        commitedHeader?: EVMBtcStoredHeader,
        synchronizer?: RelaySynchronizer<EVMBtcStoredHeader, EVMTx, any>,
        initAta?: boolean,
        feeRate?: string
    ): Promise<EVMTx[]> {
        return this.Claim.txsClaimWithTxData(
            typeof(signer)==="string" ? signer : signer.getAddress(),
            swapData,
            tx,
            requiredConfirmations,
            vout,
            commitedHeader,
            synchronizer,
            feeRate
        );
    }

    txsRefund(signer: string, swapData: EVMSwapData, check?: boolean, initAta?: boolean, feeRate?: string): Promise<EVMTx[]> {
        return this.Refund.txsRefund(signer, swapData, check, feeRate);
    }

    txsRefundWithAuthorization(signer: string, swapData: EVMSwapData, signature: SignatureData, check?: boolean, initAta?: boolean, feeRate?: string): Promise<EVMTx[]> {
        return this.Refund.txsRefundWithAuthorization(signer, swapData, signature.timeout, signature.prefix, signature.signature, check, feeRate);
    }

    txsInit(signer: string, swapData: EVMSwapData, signature: SignatureData, skipChecks?: boolean, feeRate?: string): Promise<EVMTx[]> {
        return this.Init.txsInit(signer, swapData, signature.timeout, signature.prefix, signature.signature, skipChecks, feeRate);
    }

    txsWithdraw(signer: string, token: string, amount: bigint, feeRate?: string): Promise<EVMTx[]> {
        return this.LpVault.txsWithdraw(signer, token, amount, feeRate);
    }

    txsDeposit(signer: string, token: string, amount: bigint, feeRate?: string): Promise<EVMTx[]> {
        return this.LpVault.txsDeposit(signer, token, amount, feeRate);
    }

    ////////////////////////////////////////////
    //// Executors
    async claimWithSecret(
        signer: EVMSigner,
        swapData: EVMSwapData,
        secret: string,
        checkExpiry?: boolean,
        initAta?: boolean,
        txOptions?: TransactionConfirmationOptions
    ): Promise<string> {
        const result = await this.Claim.txsClaimWithSecret(signer.getAddress(), swapData, secret, checkExpiry, txOptions?.feeRate);
        const [signature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return signature;
    }

    async claimWithTxData(
        signer: EVMSigner,
        swapData: EVMSwapData,
        tx: { blockhash: string, confirmations: number, txid: string, hex: string, height: number },
        requiredConfirmations: number,
        vout: number,
        commitedHeader?: EVMBtcStoredHeader,
        synchronizer?: RelaySynchronizer<EVMBtcStoredHeader, EVMTx, any>,
        initAta?: boolean,
        txOptions?: TransactionConfirmationOptions
    ): Promise<string> {
        const txs = await this.Claim.txsClaimWithTxData(
            signer.getAddress(), swapData, tx, requiredConfirmations, vout,
            commitedHeader, synchronizer, txOptions?.feeRate
        );
        if(txs===null) throw new Error("Btc relay not synchronized to required blockheight!");

        const txHashes = await this.Chain.sendAndConfirm(signer, txs, txOptions?.waitForConfirmation, txOptions?.abortSignal);

        return txHashes[txHashes.length - 1];
    }

    async refund(
        signer: EVMSigner,
        swapData: EVMSwapData,
        check?: boolean,
        initAta?: boolean,
        txOptions?: TransactionConfirmationOptions
    ): Promise<string> {
        let result = await this.txsRefund(signer.getAddress(), swapData, check, initAta, txOptions?.feeRate);

        const [signature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);

        return signature;
    }

    async refundWithAuthorization(
        signer: EVMSigner,
        swapData: EVMSwapData,
        signature: SignatureData,
        check?: boolean,
        initAta?: boolean,
        txOptions?: TransactionConfirmationOptions
    ): Promise<string> {
        let result = await this.txsRefundWithAuthorization(signer.getAddress(), swapData, signature, check, initAta, txOptions?.feeRate);

        const [txSignature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);

        return txSignature;
    }

    async init(
        signer: EVMSigner,
        swapData: EVMSwapData,
        signature: SignatureData,
        skipChecks?: boolean,
        txOptions?: TransactionConfirmationOptions
    ): Promise<string> {
        if(swapData.isPayIn()) {
            if(!swapData.isOfferer(signer.getAddress()) && !swapData.isOfferer(signer.getAddress())) throw new Error("Invalid signer provided!");
        } else {
            if(!swapData.isClaimer(signer.getAddress()) && !swapData.isOfferer(signer.getAddress())) throw new Error("Invalid signer provided!");
        }

        let result = await this.txsInit(signer.getAddress(), swapData, signature, skipChecks, txOptions?.feeRate);

        const txHashes = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);

        return txHashes[txHashes.length - 1];
    }

    async withdraw(
        signer: EVMSigner,
        token: string,
        amount: bigint,
        txOptions?: TransactionConfirmationOptions
    ): Promise<string> {
        const txs = await this.LpVault.txsWithdraw(signer.getAddress(), token, amount, txOptions?.feeRate);
        const [txId] = await this.Chain.sendAndConfirm(signer, txs, txOptions?.waitForConfirmation, txOptions?.abortSignal, false);
        return txId;
    }

    async deposit(
        signer: EVMSigner,
        token: string,
        amount: bigint,
        txOptions?: TransactionConfirmationOptions
    ): Promise<string> {
        const txs = await this.LpVault.txsDeposit(signer.getAddress(), token, amount, txOptions?.feeRate);
        const [txId] = await this.Chain.sendAndConfirm(signer, txs, txOptions?.waitForConfirmation, txOptions?.abortSignal, false);
        return txId;
    }

    ////////////////////////////////////////////
    //// Fees
    getInitPayInFeeRate(offerer?: string, claimer?: string, token?: string, paymentHash?: string): Promise<string> {
        return this.Chain.Fees.getFeeRate();
    }

    getInitFeeRate(offerer?: string, claimer?: string, token?: string, paymentHash?: string): Promise<string> {
        return this.Chain.Fees.getFeeRate();
    }

    getRefundFeeRate(swapData: EVMSwapData): Promise<string> {
        return this.Chain.Fees.getFeeRate();
    }

    getClaimFeeRate(signer: string, swapData: EVMSwapData): Promise<string> {
        return this.Chain.Fees.getFeeRate();
    }

    getClaimFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint> {
        return this.Claim.getClaimFee(swapData, feeRate);
    }

    /**
     * Get the estimated fee of the commit transaction
     */
    getCommitFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint> {
        return this.Init.getInitFee(swapData, feeRate);
    }

    /**
     * Get the estimated transaction fee of the refund transaction
     */
    getRefundFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint> {
        return this.Refund.getRefundFee(swapData, feeRate);
    }

}
