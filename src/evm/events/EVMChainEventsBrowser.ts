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
import {Block, hexlify, JsonRpcApiProvider} from "ethers";
import { EVMSwapContract } from "../swaps/EVMSwapContract";
import {getLogger, onceAsync} from "../../utils/Utils";
import {EVMSpvVaultContract, unpackOwnerAndVaultId} from "../spv_swap/EVMSpvVaultContract";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import {TypedEventLog} from "../typechain/common";
import {EscrowManager} from "../swaps/EscrowManagerTypechain";
import {SpvVaultManager} from "../spv_swap/SpvVaultContractTypechain";
import {EVMTxTrace} from "../chain/modules/EVMTransactions";

const LOGS_SLIDING_WINDOW_LENGTH = 60;

export type EVMEventListenerState = {lastBlockNumber: number, lastEvent?: {blockHash: string, logIndex: number}};

/**
 * EVM on-chain event handler for front-end systems without access to fs, uses WS or long-polling to subscribe, might lose
 *  out on some events if the network is unreliable, front-end systems should take this into consideration and not
 *  rely purely on events
 */
export class EVMChainEventsBrowser implements ChainEvents<EVMSwapData> {

    protected readonly listeners: EventListener<EVMSwapData>[] = [];
    protected readonly provider: JsonRpcApiProvider;
    protected readonly chainInterface: EVMChainInterface;
    protected readonly evmSwapContract: EVMSwapContract;
    protected readonly evmSpvVaultContract: EVMSpvVaultContract<any>;
    protected readonly logger = getLogger("EVMChainEventsBrowser: ");

    protected stopped: boolean;
    protected pollIntervalSeconds: number;

    private timeout: number;

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
    }

    findInitSwapData(call: EVMTxTrace, escrowHash: string, claimHandler: IClaimHandler<any, any>): EVMSwapData {
        if(call.to.toLowerCase() === this.evmSwapContract.contractAddress.toLowerCase()) {
            const result = this.evmSwapContract.parseCalldata<typeof this.evmSwapContract.contract.initialize>(call.input);
            if(result!=null && result.name==="initialize") {
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
     * @returns {() => Promise<EVMSwapData>} getter to be passed to InitializeEvent constructor
     */
    private getSwapDataGetter(
        event: TypedEventLog<EscrowManager["filters"]["Initialize"]>,
        claimHandler: IClaimHandler<any, any>
    ): () => Promise<EVMSwapData> {
        return async () => {
            const trace = await this.chainInterface.Transactions.traceTransaction(event.transactionHash);
            if(trace==null) return null;
            return this.findInitSwapData(trace, event.args.escrowHash, claimHandler);
        }
    }

    protected parseInitializeEvent(
        event: TypedEventLog<EscrowManager["filters"]["Initialize"]>
    ): InitializeEvent<EVMSwapData> {
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
            onceAsync<EVMSwapData>(this.getSwapDataGetter(event, claimHandler))
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
    ): ClaimEvent<EVMSwapData> {
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
        const btcTxId = Buffer.from(event.args.btcTxHash, "hex").reverse().toString("hex");
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
        const btcTxId = Buffer.from(event.args.btcTxHash, "hex").reverse().toString("hex");
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
        const btcTxId = Buffer.from(event.args.btcTxHash, "hex").reverse().toString("hex");
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
        const btcTxId = Buffer.from(event.args.btcTxHash, "hex").reverse().toString("hex");

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
        currentBlock: Block
    ) {
        const parsedEvents: ChainEvent<EVMSwapData>[] = [];

        for(let event of events) {
            let parsedEvent: ChainEvent<EVMSwapData>;
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
            const timestamp = event.blockNumber===currentBlock.number ? currentBlock.timestamp : await this.chainInterface.Blocks.getBlockTime(event.blockNumber);
            parsedEvent.meta = {
                blockTime: timestamp,
                txId: event.transactionHash,
                timestamp //Maybe deprecated
            } as any;
            parsedEvents.push(parsedEvent);
        }

        for(let listener of this.listeners) {
            await listener(parsedEvents);
        }
    }

    protected async checkEventsEcrowManager(currentBlock: Block, lastProcessedEvent?: {blockHash: string, logIndex: number}, lastBlockNumber?: number): Promise<[{blockHash: string, logIndex: number}, number]> {
        lastBlockNumber ??= currentBlock.number;
        this.logger.debug(`checkEvents(EscrowManager): Requesting logs: ${lastBlockNumber}...${currentBlock.number}`);
        let events = await this.evmSwapContract.Events.getContractBlockEvents(
            ["Initialize", "Claim", "Refund"],
            [],
            lastBlockNumber,
            currentBlock.number
        );
        if(lastProcessedEvent!=null) {
            const latestProcessedEventIndex = events.findIndex(val => val.blockHash===lastProcessedEvent.blockHash && val.index===lastProcessedEvent.logIndex);
            if(latestProcessedEventIndex!==-1) {
                events.splice(0, latestProcessedEventIndex+1);
                this.logger.debug("checkEvents(EscrowManager): Splicing processed events, resulting size: "+events.length);
            }
        }
        if(events.length>0) {
            await this.processEvents(events, currentBlock);
            const lastProcessed = events[events.length-1];
            lastProcessedEvent = {
                blockHash: lastProcessed.blockHash,
                logIndex: lastProcessed.index
            }
            if(lastProcessed.blockNumber > lastBlockNumber) lastBlockNumber = lastProcessed.blockNumber;
        } else if(currentBlock.number - lastBlockNumber > LOGS_SLIDING_WINDOW_LENGTH) {
            lastProcessedEvent = null;
            lastBlockNumber = currentBlock.number - LOGS_SLIDING_WINDOW_LENGTH;
        }
        return [lastProcessedEvent, lastBlockNumber];
    }

    protected async checkEventsSpvVaults(currentBlock: Block, lastProcessedEvent?: {blockHash: string, logIndex: number}, lastBlockNumber?: number): Promise<[{blockHash: string, logIndex: number}, number]> {
        lastBlockNumber ??= currentBlock.number;
        this.logger.debug(`checkEvents(SpvVaults): Requesting logs: ${lastBlockNumber}...${currentBlock.number}`);
        let events = await this.evmSpvVaultContract.Events.getContractBlockEvents(
            ["Opened", "Deposited", "Closed", "Fronted", "Claimed"],
            [],
            lastBlockNumber,
            currentBlock.number
        );
        if(lastProcessedEvent!=null) {
            const latestProcessedEventIndex = events.findIndex(val => val.blockHash===lastProcessedEvent.blockHash && val.index===lastProcessedEvent.logIndex);
            if(latestProcessedEventIndex!==-1) {
                events.splice(0, latestProcessedEventIndex+1);
                this.logger.debug("checkEvents(SpvVaults): Splicing processed events, resulting size: "+events.length);
            }
        }
        if(events.length>0) {
            await this.processEvents(events, currentBlock);
            const lastProcessed = events[events.length-1];
            lastProcessedEvent = {
                blockHash: lastProcessed.blockHash,
                logIndex: lastProcessed.index
            }
            if(lastProcessed.blockNumber > lastBlockNumber) lastBlockNumber = lastProcessed.blockNumber;
        } else if(currentBlock.number - lastBlockNumber > LOGS_SLIDING_WINDOW_LENGTH) {
            lastProcessedEvent = null;
            lastBlockNumber = currentBlock.number - LOGS_SLIDING_WINDOW_LENGTH;
        }
        return [lastProcessedEvent, lastBlockNumber];
    }

    protected async checkEvents(lastState: EVMEventListenerState[]): Promise<EVMEventListenerState[]> {
        lastState ??= [];

        const currentBlock = await this.provider.getBlock(this.chainInterface.config.safeBlockTag, false);

        const [lastEscrowEvent, lastEscrowHeight] = await this.checkEventsEcrowManager(currentBlock, lastState?.[0]?.lastEvent, lastState?.[0]?.lastBlockNumber);
        const [lastSpvVaultEvent, lastSpvVaultHeight] = await this.checkEventsSpvVaults(currentBlock, lastState?.[1]?.lastEvent, lastState?.[1]?.lastBlockNumber);

        lastState = [
            {lastBlockNumber: lastEscrowHeight, lastEvent: lastEscrowEvent},
            {lastBlockNumber: lastSpvVaultHeight, lastEvent: lastSpvVaultEvent}
        ];

        return lastState;
    }

    /**
     * Sets up event handlers listening for swap events over websocket
     *
     * @protected
     */
    protected async setupPoll(
        lastState?: EVMEventListenerState[],
        saveLatestProcessedBlockNumber?: (newState: EVMEventListenerState[]) => Promise<void>
    ) {
        this.stopped = false;
        let func;
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

    async init(): Promise<void> {
        this.setupPoll();
        this.stopped = false;
        return Promise.resolve();
    }

    async stop(): Promise<void> {
        this.stopped = true;
        if(this.timeout!=null) clearTimeout(this.timeout);
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
