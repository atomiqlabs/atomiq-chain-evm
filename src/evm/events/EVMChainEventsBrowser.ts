import {
    ChainEvent,
    ChainEvents,
    ChainSwapType,
    ClaimEvent,
    EventListener,
    InitializeEvent,
    RefundEvent, SpvVaultClaimEvent, SpvVaultCloseEvent, SpvVaultDepositEvent, SpvVaultFrontEvent, SpvVaultOpenEvent
} from "@atomiqlabs/base";
import {IClaimHandler} from "../swaps/handlers/claim/ClaimHandlers";
import {EVMSwapData} from "../swaps/EVMSwapData";
import {Block, hexlify, JsonRpcApiProvider, EventFilter, Log} from "ethers";
import { EVMSwapContract } from "../swaps/EVMSwapContract";
import {getLogger, onceAsync} from "../../utils/Utils";
import {EVMSpvVaultContract, unpackOwnerAndVaultId} from "../spv_swap/EVMSpvVaultContract";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import {TypedEventLog} from "../typechain/common";
import {EscrowManager} from "../swaps/EscrowManagerTypechain";
import {SpvVaultManager} from "../spv_swap/SpvVaultContractTypechain";
import {EVMTxTrace} from "../chain/modules/EVMTransactions";
import {TypedFunctionCall} from "../contract/EVMContractBase";

const LOGS_SLIDING_WINDOW_LENGTH = 60;

const PROCESSED_EVENTS_BACKLOG = 1000;

export type EVMEventListenerState = {lastBlockNumber: number, lastEvent?: {blockHash: string, logIndex: number}} | null;

type AtomiqTypedEvent = (
    TypedEventLog<EscrowManager["filters"]["Initialize" | "Refund" | "Claim"]> |
    TypedEventLog<SpvVaultManager["filters"]["Opened" | "Deposited" | "Fronted" | "Claimed" | "Closed"]>
);

/**
 * EVM on-chain event handler for front-end systems without access to fs, uses WS or long-polling to subscribe, might lose
 *  out on some events if the network is unreliable, front-end systems should take this into consideration and not
 *  rely purely on events
 */
export class EVMChainEventsBrowser implements ChainEvents<EVMSwapData> {

    private eventsProcessing: {
        [signature: string]: Promise<void>
    } = {};
    private processedEvents: string[] = [];
    private processedEventsIndex: number = 0;

    protected readonly listeners: EventListener<EVMSwapData>[] = [];
    protected readonly provider: JsonRpcApiProvider;
    protected readonly chainInterface: EVMChainInterface;
    protected readonly evmSwapContract: EVMSwapContract;
    protected readonly evmSpvVaultContract: EVMSpvVaultContract<any>;
    protected readonly logger = getLogger("EVMChainEventsBrowser: ");

    protected stopped: boolean = true;
    protected pollIntervalSeconds: number;

    private timeout?: any;

    //Websocket
    protected readonly spvVaultContractLogFilter: EventFilter;
    protected readonly swapContractLogFilter: EventFilter;

    protected unconfirmedEventQueue: AtomiqTypedEvent[] = [];
    protected confirmedEventQueue: {event: AtomiqTypedEvent, block: Block}[] = [];

    constructor(
        chainInterface: EVMChainInterface,
        evmSwapContract: EVMSwapContract,
        evmSpvVaultContract: EVMSpvVaultContract<any>,
        pollIntervalSeconds: number = 5
    ) {
        this.chainInterface = chainInterface;
        this.provider = chainInterface.provider;
        this.evmSwapContract = evmSwapContract;
        this.evmSpvVaultContract = evmSpvVaultContract;
        this.pollIntervalSeconds = pollIntervalSeconds;

        this.spvVaultContractLogFilter = {
            address: this.evmSpvVaultContract.contractAddress
        };
        this.swapContractLogFilter = {
            address: this.evmSwapContract.contractAddress
        };
    }

    private addProcessedEvent(event: AtomiqTypedEvent) {
        this.processedEvents[this.processedEventsIndex] = event.transactionHash+":"+event.index;
        this.processedEventsIndex += 1;
        if(this.processedEventsIndex >= PROCESSED_EVENTS_BACKLOG) this.processedEventsIndex = 0;
    }

    private isEventProcessed(event: AtomiqTypedEvent): boolean {
        return this.processedEvents.includes(event.transactionHash+":"+event.index);
    }

    findInitSwapData(call: EVMTxTrace, escrowHash: string, claimHandler: IClaimHandler<any, any>): EVMSwapData | null {
        if(call.to.toLowerCase() === this.evmSwapContract.contractAddress.toLowerCase()) {
            const _result = this.evmSwapContract.parseCalldata(call.input);
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

    /**
     * Returns async getter for fetching on-demand initialize event swap data
     *
     * @param event
     * @param claimHandler
     * @private
     * @returns {() => Promise<EVMSwapData | null>} getter to be passed to InitializeEvent constructor
     */
    private getSwapDataGetter(
        event: TypedEventLog<EscrowManager["filters"]["Initialize"]>,
        claimHandler: IClaimHandler<any, any>
    ): () => Promise<EVMSwapData | null> {
        return async () => {
            const trace = await this.chainInterface.Transactions.traceTransaction(event.transactionHash);
            if(trace==null) return null;
            return this.findInitSwapData(trace, event.args.escrowHash, claimHandler);
        }
    }

    protected parseInitializeEvent(
        event: TypedEventLog<EscrowManager["filters"]["Initialize"]>
    ): InitializeEvent<EVMSwapData> | null {
        const escrowHash = event.args.escrowHash.substring(2);
        const claimHandlerHex = event.args.claimHandler;
        const claimHandler = this.evmSwapContract.claimHandlersByAddress[claimHandlerHex.toLowerCase()];
        if(claimHandler==null) {
            this.logger.warn("parseInitializeEvent("+escrowHash+"): Unknown claim handler with claim: "+claimHandlerHex);
            return null;
        }
        const swapType: ChainSwapType = claimHandler.getType();

        this.logger.debug("InitializeEvent escrowHash: "+escrowHash);
        return new InitializeEvent<EVMSwapData>(
            escrowHash,
            swapType,
            onceAsync<EVMSwapData | null>(this.getSwapDataGetter(event, claimHandler))
        );
    }

    protected parseRefundEvent(
        event: TypedEventLog<EscrowManager["filters"]["Refund"]>
    ): RefundEvent<EVMSwapData> {
        const escrowHash = event.args.escrowHash.substring(2);
        this.logger.debug("RefundEvent escrowHash: "+escrowHash);
        return new RefundEvent<EVMSwapData>(escrowHash);
    }

    protected parseClaimEvent(
        event: TypedEventLog<EscrowManager["filters"]["Claim"]>
    ): ClaimEvent<EVMSwapData> | null {
        const escrowHash = event.args.escrowHash.substring(2);
        const claimHandlerHex = event.args.claimHandler;
        const claimHandler = this.evmSwapContract.claimHandlersByAddress[claimHandlerHex.toLowerCase()];
        if(claimHandler==null) {
            this.logger.warn("parseClaimEvent("+escrowHash+"): Unknown claim handler with claim: "+claimHandlerHex);
            return null;
        }
        const witnessResult = event.args.witnessResult.substring(2);
        this.logger.debug("ClaimEvent witnessResult: "+witnessResult+" escrowHash: "+escrowHash);
        return new ClaimEvent<EVMSwapData>(escrowHash, witnessResult);
    }

    protected parseSpvOpenEvent(
        event: TypedEventLog<SpvVaultManager["filters"]["Opened"]>
    ): SpvVaultOpenEvent {
        const owner = event.args.owner;
        const vaultId = event.args.vaultId;
        const btcTxId = Buffer.from(event.args.btcTxHash.substring(2), "hex").reverse().toString("hex");
        const vout = Number(event.args.vout);

        this.logger.debug("SpvOpenEvent owner: "+owner+" vaultId: "+vaultId+" utxo: "+btcTxId+":"+vout);
        return new SpvVaultOpenEvent(owner, vaultId, btcTxId, vout);
    }

    protected parseSpvDepositEvent(
        event: TypedEventLog<SpvVaultManager["filters"]["Deposited"]>
    ): SpvVaultDepositEvent {
        const [owner, vaultId] = unpackOwnerAndVaultId(event.args.ownerAndVaultId);
        const amounts = [event.args.amount0, event.args.amount1];
        const depositCount = Number(event.args.depositCount);

        this.logger.debug("SpvDepositEvent owner: "+owner+" vaultId: "+vaultId+" depositCount: "+depositCount+" amounts: ", amounts);
        return new SpvVaultDepositEvent(owner, vaultId, amounts, depositCount);
    }

    protected parseSpvFrontEvent(
        event: TypedEventLog<SpvVaultManager["filters"]["Fronted"]>
    ): SpvVaultFrontEvent {
        const [owner, vaultId] = unpackOwnerAndVaultId(event.args.ownerAndVaultId);
        const btcTxId = Buffer.from(event.args.btcTxHash.substring(2), "hex").reverse().toString("hex");
        const recipient = event.args.recipient;
        const executionHash = event.args.executionHash;
        const amounts = [event.args.amount0, event.args.amount1];
        const frontingAddress = event.args.caller;

        this.logger.debug("SpvFrontEvent owner: "+owner+" vaultId: "+vaultId+" btcTxId: "+btcTxId+
            " recipient: "+recipient+" frontedBy: "+frontingAddress+" amounts: ", amounts);
        return new SpvVaultFrontEvent(owner, vaultId, btcTxId, recipient, executionHash, amounts, frontingAddress);
    }

    protected parseSpvClaimEvent(
        event: TypedEventLog<SpvVaultManager["filters"]["Claimed"]>
    ): SpvVaultClaimEvent {
        const [owner, vaultId] = unpackOwnerAndVaultId(event.args.ownerAndVaultId);
        const btcTxId = Buffer.from(event.args.btcTxHash.substring(2), "hex").reverse().toString("hex");
        const recipient = event.args.recipient;
        const executionHash = event.args.executionHash;
        const amounts = [event.args.amount0, event.args.amount1];
        const caller = event.args.caller;
        const frontingAddress = event.args.frontingAddress;
        const withdrawCount = Number(event.args.withdrawCount);

        this.logger.debug("SpvClaimEvent owner: "+owner+" vaultId: "+vaultId+" btcTxId: "+btcTxId+" withdrawCount: "+withdrawCount+
            " recipient: "+recipient+" frontedBy: "+frontingAddress+" claimedBy: "+caller+" amounts: ", amounts);

        return new SpvVaultClaimEvent(owner, vaultId, btcTxId, recipient, executionHash, amounts, caller, frontingAddress, withdrawCount);
    }

    protected parseSpvCloseEvent(
        event: TypedEventLog<SpvVaultManager["filters"]["Closed"]>
    ): SpvVaultCloseEvent {
        const btcTxId = Buffer.from(event.args.btcTxHash.substring(2), "hex").reverse().toString("hex");

        return new SpvVaultCloseEvent(event.args.owner, event.args.vaultId, btcTxId, event.args.error);
    }

    /**
     * Processes event as received from the chain, parses it & calls event listeners
     *
     * @param events
     * @param currentBlock
     * @protected
     */
    protected async processEvents(
        events : (
            TypedEventLog<EscrowManager["filters"]["Initialize" | "Refund" | "Claim"]> |
            TypedEventLog<SpvVaultManager["filters"]["Opened" | "Deposited" | "Fronted" | "Claimed" | "Closed"]>
        )[],
        currentBlock?: Block
    ) {
        for(let event of events) {
            const eventIdentifier = event.transactionHash+":"+event.index;

            if(this.isEventProcessed(event)) {
                this.logger.debug("processEvents(): skipping already processed event: "+eventIdentifier);
                continue;
            }

            let parsedEvent: ChainEvent<EVMSwapData> | null = null;
            switch(event.eventName) {
                case "Claim":
                    parsedEvent = this.parseClaimEvent(event as any);
                    break;
                case "Refund":
                    parsedEvent = this.parseRefundEvent(event as any);
                    break;
                case "Initialize":
                    parsedEvent = this.parseInitializeEvent(event as any);
                    break;
                case "Opened":
                    parsedEvent = this.parseSpvOpenEvent(event as any);
                    break;
                case "Deposited":
                    parsedEvent = this.parseSpvDepositEvent(event as any);
                    break;
                case "Fronted":
                    parsedEvent = this.parseSpvFrontEvent(event as any);
                    break;
                case "Claimed":
                    parsedEvent = this.parseSpvClaimEvent(event as any);
                    break;
                case "Closed":
                    parsedEvent = this.parseSpvCloseEvent(event as any);
                    break;
            }

            if(this.eventsProcessing[eventIdentifier]!=null) {
                this.logger.debug("processEvents(): awaiting event that is currently processing: "+eventIdentifier);
                await this.eventsProcessing[eventIdentifier];
                continue;
            }

            const promise = (async() => {
                if(parsedEvent==null) return;
                const timestamp = event.blockNumber===currentBlock?.number ? currentBlock.timestamp : await this.chainInterface.Blocks.getBlockTime(event.blockNumber);
                parsedEvent.meta = {
                    blockTime: timestamp,
                    txId: event.transactionHash,
                    timestamp //Maybe deprecated
                } as any;
                const eventsArr = [parsedEvent];
                for(let listener of this.listeners) {
                    await listener(eventsArr);
                }
                this.addProcessedEvent(event);
            })();
            this.eventsProcessing[eventIdentifier] = promise;
            try {
                await promise;
                delete this.eventsProcessing[eventIdentifier];
            } catch (e) {
                delete this.eventsProcessing[eventIdentifier];
                throw e;
            }
        }
    }

    protected async checkEventsEcrowManager(
        currentBlock: Block,
        lastEvent?: {blockHash: string, logIndex: number},
        lastBlockNumber?: number
    ): Promise<EVMEventListenerState> {
        lastBlockNumber ??= currentBlock.number;
        if(currentBlock.number < lastBlockNumber) {
            this.logger.warn(`checkEventsEscrowManager(): Sanity check triggered - not processing events, currentBlock: ${currentBlock.number}, lastBlock: ${lastBlockNumber}`);
            return null;
        }
        // this.logger.debug(`checkEvents(EscrowManager): Requesting logs: ${lastBlockNumber}...${currentBlock.number}`);
        let events = await this.evmSwapContract.Events.getContractBlockEvents(
            ["Initialize", "Claim", "Refund"],
            [],
            lastBlockNumber,
            currentBlock.number
        );
        if(lastEvent!=null) {
            const latestProcessedEventIndex = events.findIndex(
                val => val.blockHash===lastEvent!.blockHash && val.index===lastEvent!.logIndex
            );
            if(latestProcessedEventIndex!==-1) {
                events.splice(0, latestProcessedEventIndex+1);
                this.logger.debug("checkEvents(EscrowManager): Splicing processed events, resulting size: "+events.length);
            }
        }
        if(events.length>0) {
            await this.processEvents(events, currentBlock);
            const lastProcessed = events[events.length-1];
            lastEvent = {
                blockHash: lastProcessed.blockHash,
                logIndex: lastProcessed.index
            }
            if(lastProcessed.blockNumber > lastBlockNumber) lastBlockNumber = lastProcessed.blockNumber;
        } else if(currentBlock.number - lastBlockNumber > LOGS_SLIDING_WINDOW_LENGTH) {
            lastEvent = undefined;
            lastBlockNumber = currentBlock.number - LOGS_SLIDING_WINDOW_LENGTH;
        }
        return {lastEvent, lastBlockNumber};
    }

    protected async checkEventsSpvVaults(
        currentBlock: Block,
        lastEvent?: {blockHash: string, logIndex: number},
        lastBlockNumber?: number
    ): Promise<EVMEventListenerState> {
        lastBlockNumber ??= currentBlock.number;
        if(currentBlock.number < lastBlockNumber) {
            this.logger.warn(`checkEventsSpvVaults(): Sanity check triggered - not processing events, currentBlock: ${currentBlock.number}, lastBlock: ${lastBlockNumber}`);
            return null;
        }
        // this.logger.debug(`checkEvents(SpvVaults): Requesting logs: ${lastBlockNumber}...${currentBlock.number}`);
        let events = await this.evmSpvVaultContract.Events.getContractBlockEvents(
            ["Opened", "Deposited", "Closed", "Fronted", "Claimed"],
            [],
            lastBlockNumber,
            currentBlock.number
        );
        if(lastEvent!=null) {
            const latestProcessedEventIndex = events.findIndex(
                val => val.blockHash===lastEvent!.blockHash && val.index===lastEvent!.logIndex
            );
            if(latestProcessedEventIndex!==-1) {
                events.splice(0, latestProcessedEventIndex+1);
                this.logger.debug("checkEvents(SpvVaults): Splicing processed events, resulting size: "+events.length);
            }
        }
        if(events.length>0) {
            await this.processEvents(events, currentBlock);
            const lastProcessed = events[events.length-1];
            lastEvent = {
                blockHash: lastProcessed.blockHash,
                logIndex: lastProcessed.index
            }
            if(lastProcessed.blockNumber > lastBlockNumber) lastBlockNumber = lastProcessed.blockNumber;
        } else if(currentBlock.number - lastBlockNumber > LOGS_SLIDING_WINDOW_LENGTH) {
            lastEvent = undefined;
            lastBlockNumber = currentBlock.number - LOGS_SLIDING_WINDOW_LENGTH;
        }
        return {lastEvent, lastBlockNumber};
    }

    protected async checkEvents(lastState?: EVMEventListenerState[] | null): Promise<EVMEventListenerState[]> {
        lastState ??= [];

        const currentBlock = await this.provider.getBlock(this.chainInterface.config.safeBlockTag, false);
        if(currentBlock==null) throw new Error(`Cannot fetch '${this.chainInterface.config.safeBlockTag}' block!`);

        const resultEscrow = await this.checkEventsEcrowManager(currentBlock, lastState?.[0]?.lastEvent, lastState?.[0]?.lastBlockNumber);
        const resultSpvVault = await this.checkEventsSpvVaults(currentBlock, lastState?.[1]?.lastEvent, lastState?.[1]?.lastBlockNumber);

        lastState = [
            resultEscrow,
            resultSpvVault
        ];

        return lastState;
    }

    /**
     * Sets up event handlers listening for swap events over websocket
     *
     * @protected
     */
    protected async setupPoll(
        lastState?: EVMEventListenerState[] | null,
        saveLatestProcessedBlockNumber?: (newState: EVMEventListenerState[]) => Promise<void>
    ) {
        this.stopped = false;
        let func: () => Promise<void>;
        func = async () => {
            await this.checkEvents(lastState).then(newState => {
                lastState = newState;
                if(saveLatestProcessedBlockNumber!=null) return saveLatestProcessedBlockNumber(newState);
            }).catch(e => {
                this.logger.error("setupPoll(): Failed to fetch evm log: ", e);
            });
            if(this.stopped) return;
            this.timeout = setTimeout(func, this.pollIntervalSeconds*1000) as any;
        };
        await func();
    }

    //Websocket

    protected handleWsEvent(
        event: AtomiqTypedEvent
    ): Promise<void> {
        if(this.chainInterface.config.safeBlockTag==="latest" || this.chainInterface.config.safeBlockTag==="pending") {
            return this.processEvents([event]);
        }
        this.unconfirmedEventQueue.push(event);
        return this.addOrRemoveBlockListener();
    }

    protected spvVaultContractListener?: (log: Log) => void;
    protected swapContractListener?: (log: Log) => void;
    protected blockListener?: (blockNumber: number) => Promise<void>;
    protected finalityCheckTimer: any;
    protected wsStarted: boolean = false;

    protected async checkUnconfirmedEventsFinality() {
        if(this.unconfirmedEventQueue.length>0) {
            const latestSafeBlock = await this.provider.getBlock(this.chainInterface.config.safeBlockTag);
            if(latestSafeBlock==null) throw new Error(`Failed to fetch '${this.chainInterface.config.safeBlockTag}' block!`);

            const events = this.unconfirmedEventQueue.filter(event => {
                return event.blockNumber <= latestSafeBlock.number;
            });

            for(let event of events) {
                const block = await this.chainInterface.Blocks.getBlock(event.blockNumber);
                if(block.hash===event.blockHash) {
                    //Valid event
                    const index = this.unconfirmedEventQueue.indexOf(event);
                    if(index!==-1) this.unconfirmedEventQueue.splice(index, 1);
                    this.confirmedEventQueue.push({event, block});
                } else {
                    //Block hash doesn't match
                }
            }
        }

        for(let confirmedEvent of this.confirmedEventQueue) {
            await this.processEvents([confirmedEvent.event], confirmedEvent.block);
            const index = this.confirmedEventQueue.indexOf(confirmedEvent);
            if(index!==-1) this.confirmedEventQueue.splice(index, 1);
        }
    }

    protected async addOrRemoveBlockListener() {
        if(this.chainInterface.config.finalityCheckStrategy?.type!=="blocks") return;
        if(this.unconfirmedEventQueue.length>0 || this.confirmedEventQueue.length>0) {
            this.logger.debug(`addOrRemoveBlockListener(): Adding block listener, unconfirmed/confirmed event count: ${this.unconfirmedEventQueue.length + this.confirmedEventQueue.length}`);
            await this.provider.on("block", this.blockListener!);
        } else {
            this.logger.debug(`addOrRemoveBlockListener(): Removing block listener, unconfirmed/confirmed event count: ${this.unconfirmedEventQueue.length + this.confirmedEventQueue.length}`);
            await this.provider.off("block", this.blockListener);
        }
    }

    protected async startFinalityCheckTimer() {
        let check: () => Promise<void>;
        check = async () => {
            if(!this.wsStarted) return;
            if(this.unconfirmedEventQueue.length>0 || this.confirmedEventQueue.length>0) {
                try {
                    await this.checkUnconfirmedEventsFinality();
                } catch (e) {
                    this.logger.error(`startFinalityCheckTimer(): Error when checking past events: `, e);
                }
            }
            if(!this.wsStarted) return;
            this.finalityCheckTimer = setTimeout(check, this.chainInterface.config.finalityCheckStrategy?.delayMs ?? 5*1000);
        };
        await check();
    }

    protected async setupWebsocket() {
        this.wsStarted = true;

        let processing = false;
        this.blockListener = async (blockNumber: number) => {
            if(processing) return;
            if(this.unconfirmedEventQueue.length===0 && this.confirmedEventQueue.length===0) return;
            processing = true;
            try {
                await this.checkUnconfirmedEventsFinality();
            } catch (e) {
                this.logger.error(`on('block'): Error when processing new block ${blockNumber}:`, e);
            }
            processing = false;
            await this.addOrRemoveBlockListener();
        }

        if(this.chainInterface.config.safeBlockTag==="safe" || this.chainInterface.config.safeBlockTag==="finalized") {
            if(this.chainInterface.config.finalityCheckStrategy?.type==="timer") this.startFinalityCheckTimer();
        }

        await this.provider.on(this.spvVaultContractLogFilter, this.spvVaultContractListener = (log) => {
            let [event] = this.evmSpvVaultContract.Events.toTypedEvents([log]);
            if(event==null || event.removed) return;
            this.handleWsEvent(event);
        });

        await this.provider.on(this.swapContractLogFilter, this.swapContractListener = (log) => {
            let [event] = this.evmSwapContract.Events.toTypedEvents([log]);
            if(event==null || event.removed) return;
            if(event.eventName!=="Initialize" && event.eventName!=="Refund" && event.eventName!=="Claim") return;
            this.handleWsEvent(event);
        });
    }

    async init(): Promise<void> {
        if((this.provider as any).websocket!=null) {
            await this.setupWebsocket();
        } else {
            await this.setupPoll();
        }
        this.stopped = false;
        return Promise.resolve();
    }

    async stop(): Promise<void> {
        this.stopped = true;
        if(this.timeout!=null) clearTimeout(this.timeout);
        if(this.wsStarted) {
            await this.provider.off(this.spvVaultContractLogFilter, this.spvVaultContractListener);
            await this.provider.off(this.swapContractLogFilter, this.swapContractListener);
            await this.provider.off("block", this.blockListener);
            this.wsStarted = false;
            clearTimeout(this.finalityCheckTimer);
        }
    }

    registerListener(cbk: EventListener<EVMSwapData>): void {
        this.listeners.push(cbk);
    }

    unregisterListener(cbk: EventListener<EVMSwapData>): boolean {
        const index = this.listeners.indexOf(cbk);
        if(index>=0) {
            this.listeners.splice(index, 1);
            return true;
        }
        return false;
    }
}
