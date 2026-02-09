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
import {EVMContractBase, TypedFunctionCall} from "../contract/EVMContractBase";
import {EscrowManager} from "./EscrowManagerTypechain";
import { EVMSwapData } from "./EVMSwapData";
import {EVMTx, EVMTxTrace} from "../chain/modules/EVMTransactions";
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
import {TypedEventLog} from "../typechain/common";
import {getLogger} from "../../utils/Utils";

const ESCROW_STATE_COMMITTED = 1;
const ESCROW_STATE_CLAIMED = 2;
const ESCROW_STATE_REFUNDED = 3;

const logger = getLogger("EVMSwapContract: ");

/**
 * @category Swaps
 */
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
        },
        contractDeploymentHeight?: number
    ) {
        super(chainInterface, contractAddress, EscrowManagerAbi, contractDeploymentHeight);
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

    /**
     * @inheritDoc
     */
    async start(): Promise<void> {
    }

    ////////////////////////////////////////////
    //// Signatures
    /**
     * @inheritDoc
     */
    preFetchForInitSignatureVerification(): Promise<EVMPreFetchVerification> {
        return this.Init.preFetchForInitSignatureVerification();
    }

    /**
     * @inheritDoc
     */
    getInitSignature(signer: EVMSigner, swapData: EVMSwapData, authorizationTimeout: number, preFetchedBlockData?: never, feeRate?: string): Promise<SignatureData> {
        return this.Init.signSwapInitialization(signer, swapData, authorizationTimeout);
    }

    /**
     * @inheritDoc
     */
    isValidInitAuthorization(sender: string, swapData: EVMSwapData, signature: SignatureData, feeRate?: string, preFetchedData?: EVMPreFetchVerification): Promise<Buffer | null> {
        return this.Init.isSignatureValid(sender, swapData, signature.timeout, signature.prefix, signature.signature, preFetchedData);
    }

    /**
     * @inheritDoc
     */
    getInitAuthorizationExpiry(swapData: EVMSwapData, signature: SignatureData, preFetchedData?: EVMPreFetchVerification): Promise<number> {
        return this.Init.getSignatureExpiry(signature.timeout);
    }

    /**
     * @inheritDoc
     */
    isInitAuthorizationExpired(swapData: EVMSwapData, signature: SignatureData): Promise<boolean> {
        return this.Init.isSignatureExpired(signature.timeout);
    }

    /**
     * @inheritDoc
     */
    getRefundSignature(signer: EVMSigner, swapData: EVMSwapData, authorizationTimeout: number): Promise<SignatureData> {
        return this.Refund.signSwapRefund(signer, swapData, authorizationTimeout);
    }

    /**
     * @inheritDoc
     */
    isValidRefundAuthorization(swapData: EVMSwapData, signature: SignatureData): Promise<Buffer |  null> {
        return this.Refund.isSignatureValid(swapData, signature.timeout, signature.prefix, signature.signature);
    }

    /**
     * @inheritDoc
     */
    getDataSignature(signer: EVMSigner, data: Buffer): Promise<string> {
        return this.Chain.Signatures.getDataSignature(signer, data);
    }

    /**
     * @inheritDoc
     */
    isValidDataSignature(data: Buffer, signature: string, publicKey: string): Promise<boolean> {
        return this.Chain.Signatures.isValidDataSignature(data, signature, publicKey);
    }

    ////////////////////////////////////////////
    //// Swap data utils
    /**
     * @inheritDoc
     */
    async isClaimable(signer: string, data: EVMSwapData): Promise<boolean> {
        if(!data.isClaimer(signer)) return false;
        if(await this.isExpired(signer, data)) return false;
        return await this.isCommited(data);
    }

    /**
     * @inheritDoc
     */
    async isCommited(swapData: EVMSwapData): Promise<boolean> {
        const data = await this.contract.getHashState("0x"+swapData.getEscrowHash());
        return Number(data.state)===ESCROW_STATE_COMMITTED;
    }

    /**
     * @inheritDoc
     */
    isExpired(signer: string, data: EVMSwapData): Promise<boolean> {
        let currentTimestamp: bigint = BigInt(Math.floor(Date.now()/1000));
        if(data.isClaimer(signer)) currentTimestamp = currentTimestamp + BigInt(this.claimGracePeriod);
        if(data.isOfferer(signer)) currentTimestamp = currentTimestamp - BigInt(this.refundGracePeriod);
        return Promise.resolve(data.getExpiry() < currentTimestamp);
    }

    /**
     * @inheritDoc
     */
    async isRequestRefundable(signer: string, data: EVMSwapData): Promise<boolean> {
        //Swap can only be refunded by the offerer
        if(!data.isOfferer(signer)) return false;
        if(!(await this.isExpired(signer, data))) return false;
        return await this.isCommited(data);
    }

    /**
     * @inheritDoc
     */
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
     * @inheritDoc
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
     * @inheritDoc
     */
    getHashForHtlc(paymentHash: Buffer): Buffer {
        const htlcHandler = this.claimHandlersBySwapType[ChainSwapType.HTLC];
        if(htlcHandler==null) throw new Error("Claim handler for HTLC not found!");
        return Buffer.from(htlcHandler.getCommitment(paymentHash).slice(2), "hex");
    }

    /**
     * @inheritDoc
     */
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
     * @inheritDoc
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
            case ESCROW_STATE_REFUNDED:
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
            default:
                return {
                    type: await this.isExpired(signer, data) ? SwapCommitStateType.EXPIRED : SwapCommitStateType.NOT_COMMITED,
                };
        }
    }

    /**
     * @inheritDoc
     */
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

    async getHistoricalSwaps(signer: string, startBlockheight?: number): Promise<{
        swaps: {
            [escrowHash: string]: {
                init?: {
                    data: EVMSwapData;
                    getInitTxId: () => Promise<string>;
                    getTxBlock: () => Promise<{ blockTime: number; blockHeight: number }>
                };
                state: SwapCommitState
            }
        };
        latestBlockheight?: number
    }> {
        const {height: latestBlockheight} = await this.Chain.getFinalizedBlock();

        const swapsOpened: {
            [escrowHash: string]: {
                data: EVMSwapData,
                getInitTxId: () => Promise<string>,
                getTxBlock: () => Promise<{
                    blockTime: number,
                    blockHeight: number
                }>
            }
        } = {};
        const resultingSwaps: {
            [escrowHash: string]: {
                init?: {
                    data: EVMSwapData;
                    getInitTxId: () => Promise<string>;
                    getTxBlock: () => Promise<{ blockTime: number; blockHeight: number }>
                };
                state: SwapCommitState
            }
        } = {};

        const processor = async (_event: TypedEventLog<EscrowManager["filters"]["Initialize" | "Claim" | "Refund"]>) => {
            const escrowHash = _event.args.escrowHash.substring(2);
            if(_event.eventName==="Initialize") {
                const event = _event as TypedEventLog<EscrowManager["filters"]["Initialize"]>;
                const claimHandlerHex = event.args.claimHandler;

                const claimHandler = this.claimHandlersByAddress[claimHandlerHex.toLowerCase()];
                if(claimHandler==null) {
                    logger.warn(`getHistoricalSwaps(): Unknown claim handler in tx ${event.transactionHash} with claim handler: `+claimHandlerHex);
                    return null;
                }

                const txTrace = await this.Chain.Transactions.traceTransaction(event.transactionHash);
                const data = this.findInitSwapData(txTrace, event.args.escrowHash, claimHandler);
                if(data==null) {
                    logger.warn(`getHistoricalSwaps(): Cannot parse swap data from tx ${event.transactionHash} with escrow hash: `+escrowHash);
                    return null;
                }

                swapsOpened[escrowHash] = {
                    data,
                    getInitTxId: () => Promise.resolve(event.transactionHash),
                    getTxBlock: async () => {
                        return {
                            blockHeight: event.blockNumber,
                            blockTime: await this.Chain.Blocks.getBlockTime(event.blockNumber)
                        }
                    }
                }
            }
            if(_event.eventName==="Claim") {
                const event = _event as TypedEventLog<EscrowManager["filters"]["Claim"]>;
                const foundSwapData = swapsOpened[escrowHash];
                delete swapsOpened[escrowHash];
                resultingSwaps[escrowHash] = {
                    init: foundSwapData,
                    state: {
                        type: SwapCommitStateType.PAID,
                        getClaimTxId: () => Promise.resolve(event.transactionHash),
                        getClaimResult: () => Promise.resolve(event.args.witnessResult.substring(2)),
                        getTxBlock: async () => {
                            return {
                                blockHeight: event.blockNumber,
                                blockTime: await this.Chain.Blocks.getBlockTime(event.blockNumber)
                            }
                        }
                    }
                }
            }
            if(_event.eventName==="Refund") {
                const event = _event as TypedEventLog<EscrowManager["filters"]["Refund"]>;
                const foundSwapData = swapsOpened[escrowHash];
                delete swapsOpened[escrowHash];
                const isExpired = foundSwapData!=null && await this.isExpired(signer, foundSwapData.data);
                resultingSwaps[escrowHash] = {
                    init: foundSwapData,
                    state: {
                        type: isExpired ? SwapCommitStateType.EXPIRED : SwapCommitStateType.NOT_COMMITED,
                        getRefundTxId: () => Promise.resolve(event.transactionHash),
                        getTxBlock: async () => {
                            return {
                                blockHeight: event.blockNumber,
                                blockTime: await this.Chain.Blocks.getBlockTime(event.blockNumber)
                            }
                        }
                    }
                }
            }
        };

        //We have to fetch separately the different directions
        await this.Events.findInContractEventsForward(
            ["Initialize", "Claim", "Refund"],
            [signer, null],
            processor,
            startBlockheight
        );
        await this.Events.findInContractEventsForward(
            ["Initialize", "Claim", "Refund"],
            [null, signer],
            processor,
            startBlockheight
        );

        logger.debug(`getHistoricalSwaps(): Found ${Object.keys(resultingSwaps).length} settled swaps!`);
        logger.debug(`getHistoricalSwaps(): Found ${Object.keys(swapsOpened).length} unsettled swaps!`);

        for(let escrowHash in swapsOpened) {
            const foundSwapData = swapsOpened[escrowHash];
            const isExpired = await this.isExpired(signer, foundSwapData.data);
            resultingSwaps[escrowHash] = {
                init: foundSwapData,
                state: foundSwapData.data.isOfferer(signer) && isExpired
                    ? {type: SwapCommitStateType.REFUNDABLE}
                    : {type: SwapCommitStateType.COMMITED}
            }
        }

        return {
            swaps: resultingSwaps,
            latestBlockheight: latestBlockheight ?? startBlockheight
        }
    }

    ////////////////////////////////////////////
    //// Swap data initializer
    /**
     * @inheritDoc
     */
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

    findInitSwapData(call: EVMTxTrace, escrowHash: string, claimHandler: IClaimHandler<any, any>): EVMSwapData | null {
        if(call.to.toLowerCase() === this.contractAddress.toLowerCase()) {
            const _result = this.parseCalldata(call.input);
            if(_result!=null && _result.name==="initialize") {
                const result = _result as TypedFunctionCall<
                    // @ts-ignore
                    typeof this.evmSwapContract.contract.initialize
                >;
                //Found, check correct escrow hash
                const [escrowData, signature, timeout, extraData] = result.args;
                const escrow = EVMSwapData.deserializeFromStruct(escrowData, claimHandler);
                if("0x"+escrow.getEscrowHash()===escrowHash) {
                    const extraDataHex = hexlify(extraData);
                    if(extraDataHex.length>2) {
                        escrow.setExtraData(extraDataHex.substring(2));
                    }
                    return escrow;
                }
            }
        }
        for(let _call of call.calls) {
            const found = this.findInitSwapData(_call, escrowHash, claimHandler);
            if(found!=null) return found;
        }
        return null;
    }

    ////////////////////////////////////////////
    //// Utils
    /**
     * @inheritDoc
     */
    async getBalance(signer: string, tokenAddress: string, inContract?: boolean): Promise<bigint> {
        if(inContract) return await this.getIntermediaryBalance(signer, tokenAddress);

        return await this.Chain.getBalance(signer, tokenAddress);
    }

    /**
     * @inheritDoc
     */
    getIntermediaryData(address: string, token: string): Promise<{
        balance: bigint,
        reputation: IntermediaryReputationType
    }> {
        return this.LpVault.getIntermediaryData(address, token);
    }

    /**
     * @inheritDoc
     */
    getIntermediaryReputation(address: string, token: string): Promise<IntermediaryReputationType> {
        return this.LpVault.getIntermediaryReputation(address, token);
    }

    getIntermediaryBalance(address: string, token: string): Promise<bigint> {
        return this.LpVault.getIntermediaryBalance(address, token);
    }

    ////////////////////////////////////////////
    //// Transaction initializers
    /**
     * @inheritDoc
     */
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

    /**
     * @inheritDoc
     */
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

    /**
     * @inheritDoc
     */
    txsRefund(signer: string, swapData: EVMSwapData, check?: boolean, initAta?: boolean, feeRate?: string): Promise<EVMTx[]> {
        return this.Refund.txsRefund(signer, swapData, check, feeRate);
    }

    /**
     * @inheritDoc
     */
    txsRefundWithAuthorization(signer: string, swapData: EVMSwapData, signature: SignatureData, check?: boolean, initAta?: boolean, feeRate?: string): Promise<EVMTx[]> {
        return this.Refund.txsRefundWithAuthorization(signer, swapData, signature.timeout, signature.prefix, signature.signature, check, feeRate);
    }

    /**
     * @inheritDoc
     */
    txsInit(signer: string, swapData: EVMSwapData, signature: SignatureData, skipChecks?: boolean, feeRate?: string): Promise<EVMTx[]> {
        return this.Init.txsInit(signer, swapData, signature.timeout, signature.prefix, signature.signature, skipChecks, feeRate);
    }

    /**
     * @inheritDoc
     */
    txsWithdraw(signer: string, token: string, amount: bigint, feeRate?: string): Promise<EVMTx[]> {
        return this.LpVault.txsWithdraw(signer, token, amount, feeRate);
    }

    /**
     * @inheritDoc
     */
    txsDeposit(signer: string, token: string, amount: bigint, feeRate?: string): Promise<EVMTx[]> {
        return this.LpVault.txsDeposit(signer, token, amount, feeRate);
    }

    ////////////////////////////////////////////
    //// Executors
    /**
     * @inheritDoc
     */
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

    /**
     * @inheritDoc
     */
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

    /**
     * @inheritDoc
     */
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

    /**
     * @inheritDoc
     */
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

    /**
     * @inheritDoc
     */
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

    /**
     * @inheritDoc
     */
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

    /**
     * @inheritDoc
     */
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
    /**
     * @inheritDoc
     */
    getInitPayInFeeRate(offerer?: string, claimer?: string, token?: string, paymentHash?: string): Promise<string> {
        return this.Chain.Fees.getFeeRate();
    }

    /**
     * @inheritDoc
     */
    getInitFeeRate(offerer?: string, claimer?: string, token?: string, paymentHash?: string): Promise<string> {
        return this.Chain.Fees.getFeeRate();
    }

    /**
     * @inheritDoc
     */
    getRefundFeeRate(swapData: EVMSwapData): Promise<string> {
        return this.Chain.Fees.getFeeRate();
    }

    /**
     * @inheritDoc
     */
    getClaimFeeRate(signer: string, swapData: EVMSwapData): Promise<string> {
        return this.Chain.Fees.getFeeRate();
    }

    /**
     * @inheritDoc
     */
    getClaimFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint> {
        return this.Claim.getClaimFee(swapData, feeRate);
    }

    /**
     * @inheritDoc
     */
    getCommitFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint> {
        return this.Init.getInitFee(swapData, feeRate);
    }

    /**
     * @inheritDoc
     */
    getRefundFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint> {
        return this.Refund.getRefundFee(swapData, feeRate);
    }

}
