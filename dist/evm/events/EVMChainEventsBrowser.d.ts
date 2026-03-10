import { ChainEvents, EventListener } from "@atomiqlabs/base";
import { EVMSwapData } from "../swaps/EVMSwapData";
import { Block, JsonRpcApiProvider, EventFilter, Log } from "ethers";
import { EVMSwapContract } from "../swaps/EVMSwapContract";
import { EVMSpvVaultContract } from "../spv_swap/EVMSpvVaultContract";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import { TypedEventLog } from "../typechain/common";
import { EscrowManager } from "../swaps/EscrowManagerTypechain";
import { SpvVaultManager } from "../spv_swap/SpvVaultContractTypechain";
/**
 * Current state of the EVM event listener, containing the last processed block number
 *  and event position.
 *
 * @category Events
 */
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
 *
 * @category Events
 */
export declare class EVMChainEventsBrowser implements ChainEvents<EVMSwapData, EVMEventListenerState[]> {
    private eventsProcessing;
    private processedEvents;
    private processedEventsIndex;
    /**
     * @internal
     */
    protected readonly listeners: EventListener<EVMSwapData>[];
    /**
     * @internal
     */
    protected readonly provider: JsonRpcApiProvider;
    /**
     * @internal
     */
    protected readonly chainInterface: EVMChainInterface;
    /**
     * @internal
     */
    protected readonly evmSwapContract: EVMSwapContract;
    /**
     * @internal
     */
    protected readonly evmSpvVaultContract: EVMSpvVaultContract<any>;
    /**
     * @internal
     */
    protected readonly logger: import("../../utils/Utils").LoggerType;
    /**
     * @internal
     */
    protected stopped: boolean;
    /**
     * @internal
     */
    protected pollIntervalSeconds: number;
    private timeout?;
    /**
     * @internal
     */
    protected readonly spvVaultContractLogFilter: EventFilter;
    /**
     * @internal
     */
    protected readonly swapContractLogFilter: EventFilter;
    /**
     * @internal
     */
    protected unconfirmedEventQueue: AtomiqTypedEvent[];
    /**
     * @internal
     */
    protected confirmedEventQueue: {
        event: AtomiqTypedEvent;
        block: Block;
    }[];
    constructor(chainInterface: EVMChainInterface, evmSwapContract: EVMSwapContract, evmSpvVaultContract: EVMSpvVaultContract<any>, pollIntervalSeconds?: number);
    private addProcessedEvent;
    private isEventProcessed;
    /**
     * Returns async getter for fetching on-demand initialize event swap data
     *
     * @param event
     * @param claimHandler
     * @private
     * @returns {() => Promise<EVMSwapData | null>} getter to be passed to InitializeEvent constructor
     */
    private getSwapDataGetter;
    private parseInitializeEvent;
    private parseRefundEvent;
    private parseClaimEvent;
    private parseSpvOpenEvent;
    private parseSpvDepositEvent;
    private parseSpvFrontEvent;
    private parseSpvClaimEvent;
    private parseSpvCloseEvent;
    /**
     * Processes event as received from the chain, parses it & calls event listeners
     *
     * @param events
     * @param currentBlock
     * @protected
     */
    private processEvents;
    private checkEventsEcrowManager;
    private checkEventsSpvVaults;
    /**
     * @inheritDoc
     */
    poll(lastState?: EVMEventListenerState[]): Promise<EVMEventListenerState[]>;
    /**
     * Sets up event handlers listening for swap events over websocket
     *
     * @internal
     */
    protected setupPoll(lastState?: EVMEventListenerState[], saveLatestProcessedBlockNumber?: (newState: EVMEventListenerState[]) => Promise<void>): Promise<void>;
    /**
     * @internal
     */
    protected handleWsEvent(event: AtomiqTypedEvent): Promise<void>;
    /**
     * @internal
     */
    protected spvVaultContractListener?: (log: Log) => void;
    /**
     * @internal
     */
    protected swapContractListener?: (log: Log) => void;
    /**
     * @internal
     */
    protected blockListener?: (blockNumber: number) => Promise<void>;
    /**
     * @internal
     */
    protected finalityCheckTimer: any;
    /**
     * @internal
     */
    protected wsStarted: boolean;
    /**
     * @internal
     */
    protected checkUnconfirmedEventsFinality(): Promise<void>;
    /**
     * @internal
     */
    protected addOrRemoveBlockListener(): Promise<void>;
    /**
     * @internal
     */
    protected startFinalityCheckTimer(): Promise<void>;
    /**
     * @internal
     */
    protected setupWebsocket(): Promise<void>;
    /**
     * @inheritDoc
     */
    init(noAutomaticPoll?: boolean): Promise<void>;
    /**
     * @inheritDoc
     */
    stop(): Promise<void>;
    /**
     * @inheritDoc
     */
    registerListener(cbk: EventListener<EVMSwapData>): void;
    /**
     * @inheritDoc
     */
    unregisterListener(cbk: EventListener<EVMSwapData>): boolean;
}
export {};
