import { ChainEvents, ClaimEvent, EventListener, InitializeEvent, RefundEvent, SpvVaultClaimEvent, SpvVaultCloseEvent, SpvVaultDepositEvent, SpvVaultFrontEvent, SpvVaultOpenEvent } from "@atomiqlabs/base";
import { IClaimHandler } from "../swaps/handlers/claim/ClaimHandlers";
import { EVMSwapData } from "../swaps/EVMSwapData";
import { Block, JsonRpcApiProvider, EventFilter, Log } from "ethers";
import { EVMSwapContract } from "../swaps/EVMSwapContract";
import { EVMSpvVaultContract } from "../spv_swap/EVMSpvVaultContract";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import { TypedEventLog } from "../typechain/common";
import { EscrowManager } from "../swaps/EscrowManagerTypechain";
import { SpvVaultManager } from "../spv_swap/SpvVaultContractTypechain";
import { EVMTxTrace } from "../chain/modules/EVMTransactions";
export type EVMEventListenerState = {
    lastBlockNumber: number;
    lastEvent?: {
        blockHash: string;
        logIndex: number;
    };
} | null;
type AtomiqTypedEvent = (TypedEventLog<EscrowManager["filters"]["Initialize" | "Refund" | "Claim"]> | TypedEventLog<SpvVaultManager["filters"]["Opened" | "Deposited" | "Fronted" | "Claimed" | "Closed"]>);
/**
 * EVM on-chain event handler for front-end systems without access to fs, uses WS or long-polling to subscribe, might lose
 *  out on some events if the network is unreliable, front-end systems should take this into consideration and not
 *  rely purely on events
 */
export declare class EVMChainEventsBrowser implements ChainEvents<EVMSwapData> {
    private eventsProcessing;
    private processedEvents;
    private processedEventsIndex;
    protected readonly listeners: EventListener<EVMSwapData>[];
    protected readonly provider: JsonRpcApiProvider;
    protected readonly chainInterface: EVMChainInterface;
    protected readonly evmSwapContract: EVMSwapContract;
    protected readonly evmSpvVaultContract: EVMSpvVaultContract<any>;
    protected readonly logger: import("../../utils/Utils").LoggerType;
    protected stopped: boolean;
    protected pollIntervalSeconds: number;
    private timeout?;
    protected readonly spvVaultContractLogFilter: EventFilter;
    protected readonly swapContractLogFilter: EventFilter;
    protected unconfirmedEventQueue: AtomiqTypedEvent[];
    protected confirmedEventQueue: {
        event: AtomiqTypedEvent;
        block: Block;
    }[];
    constructor(chainInterface: EVMChainInterface, evmSwapContract: EVMSwapContract, evmSpvVaultContract: EVMSpvVaultContract<any>, pollIntervalSeconds?: number);
    private addProcessedEvent;
    private isEventProcessed;
    findInitSwapData(call: EVMTxTrace, escrowHash: string, claimHandler: IClaimHandler<any, any>): EVMSwapData | null;
    /**
     * Returns async getter for fetching on-demand initialize event swap data
     *
     * @param event
     * @param claimHandler
     * @private
     * @returns {() => Promise<EVMSwapData | null>} getter to be passed to InitializeEvent constructor
     */
    private getSwapDataGetter;
    protected parseInitializeEvent(event: TypedEventLog<EscrowManager["filters"]["Initialize"]>): InitializeEvent<EVMSwapData> | null;
    protected parseRefundEvent(event: TypedEventLog<EscrowManager["filters"]["Refund"]>): RefundEvent<EVMSwapData>;
    protected parseClaimEvent(event: TypedEventLog<EscrowManager["filters"]["Claim"]>): ClaimEvent<EVMSwapData> | null;
    protected parseSpvOpenEvent(event: TypedEventLog<SpvVaultManager["filters"]["Opened"]>): SpvVaultOpenEvent;
    protected parseSpvDepositEvent(event: TypedEventLog<SpvVaultManager["filters"]["Deposited"]>): SpvVaultDepositEvent;
    protected parseSpvFrontEvent(event: TypedEventLog<SpvVaultManager["filters"]["Fronted"]>): SpvVaultFrontEvent;
    protected parseSpvClaimEvent(event: TypedEventLog<SpvVaultManager["filters"]["Claimed"]>): SpvVaultClaimEvent;
    protected parseSpvCloseEvent(event: TypedEventLog<SpvVaultManager["filters"]["Closed"]>): SpvVaultCloseEvent;
    /**
     * Processes event as received from the chain, parses it & calls event listeners
     *
     * @param events
     * @param currentBlock
     * @protected
     */
    protected processEvents(events: (TypedEventLog<EscrowManager["filters"]["Initialize" | "Refund" | "Claim"]> | TypedEventLog<SpvVaultManager["filters"]["Opened" | "Deposited" | "Fronted" | "Claimed" | "Closed"]>)[], currentBlock?: Block): Promise<void>;
    protected checkEventsEcrowManager(currentBlock: Block, lastEvent?: {
        blockHash: string;
        logIndex: number;
    }, lastBlockNumber?: number): Promise<EVMEventListenerState>;
    protected checkEventsSpvVaults(currentBlock: Block, lastEvent?: {
        blockHash: string;
        logIndex: number;
    }, lastBlockNumber?: number): Promise<EVMEventListenerState>;
    protected checkEvents(lastState?: EVMEventListenerState[] | null): Promise<EVMEventListenerState[]>;
    /**
     * Sets up event handlers listening for swap events over websocket
     *
     * @protected
     */
    protected setupPoll(lastState?: EVMEventListenerState[] | null, saveLatestProcessedBlockNumber?: (newState: EVMEventListenerState[]) => Promise<void>): Promise<void>;
    protected handleWsEvent(event: AtomiqTypedEvent): Promise<void>;
    protected spvVaultContractListener?: (log: Log) => void;
    protected swapContractListener?: (log: Log) => void;
    protected blockListener?: (blockNumber: number) => Promise<void>;
    protected finalityCheckTimer: any;
    protected wsStarted: boolean;
    protected checkUnconfirmedEventsFinality(): Promise<void>;
    protected addOrRemoveBlockListener(): Promise<void>;
    protected startFinalityCheckTimer(): Promise<void>;
    protected setupWebsocket(): Promise<void>;
    init(): Promise<void>;
    stop(): Promise<void>;
    registerListener(cbk: EventListener<EVMSwapData>): void;
    unregisterListener(cbk: EventListener<EVMSwapData>): boolean;
}
export {};
