import { ChainEvents, ClaimEvent, EventListener, InitializeEvent, RefundEvent, SpvVaultClaimEvent, SpvVaultCloseEvent, SpvVaultDepositEvent, SpvVaultFrontEvent, SpvVaultOpenEvent } from "@atomiqlabs/base";
import { IClaimHandler } from "../swaps/handlers/claim/ClaimHandlers";
import { EVMSwapData } from "../swaps/EVMSwapData";
import { Block, JsonRpcApiProvider } from "ethers";
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
};
/**
 * EVM on-chain event handler for front-end systems without access to fs, uses WS or long-polling to subscribe, might lose
 *  out on some events if the network is unreliable, front-end systems should take this into consideration and not
 *  rely purely on events
 */
export declare class EVMChainEventsBrowser implements ChainEvents<EVMSwapData> {
    protected readonly listeners: EventListener<EVMSwapData>[];
    protected readonly provider: JsonRpcApiProvider;
    protected readonly chainInterface: EVMChainInterface;
    protected readonly evmSwapContract: EVMSwapContract;
    protected readonly evmSpvVaultContract: EVMSpvVaultContract<any>;
    protected readonly logger: {
        debug: (msg: any, ...args: any[]) => void;
        info: (msg: any, ...args: any[]) => void; /**
         * EVM on-chain event handler for front-end systems without access to fs, uses WS or long-polling to subscribe, might lose
         *  out on some events if the network is unreliable, front-end systems should take this into consideration and not
         *  rely purely on events
         */
        warn: (msg: any, ...args: any[]) => void;
        error: (msg: any, ...args: any[]) => void;
    };
    protected stopped: boolean;
    protected pollIntervalSeconds: number;
    private timeout;
    constructor(chainInterface: EVMChainInterface, evmSwapContract: EVMSwapContract, evmSpvVaultContract: EVMSpvVaultContract<any>, pollIntervalSeconds?: number);
    findInitSwapData(call: EVMTxTrace, escrowHash: string, claimHandler: IClaimHandler<any, any>): EVMSwapData;
    /**
     * Returns async getter for fetching on-demand initialize event swap data
     *
     * @param event
     * @param claimHandler
     * @private
     * @returns {() => Promise<EVMSwapData>} getter to be passed to InitializeEvent constructor
     */
    private getSwapDataGetter;
    protected parseInitializeEvent(event: TypedEventLog<EscrowManager["filters"]["Initialize"]>): InitializeEvent<EVMSwapData>;
    protected parseRefundEvent(event: TypedEventLog<EscrowManager["filters"]["Refund"]>): RefundEvent<EVMSwapData>;
    protected parseClaimEvent(event: TypedEventLog<EscrowManager["filters"]["Claim"]>): ClaimEvent<EVMSwapData>;
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
    protected processEvents(events: (TypedEventLog<EscrowManager["filters"]["Initialize" | "Refund" | "Claim"]> | TypedEventLog<SpvVaultManager["filters"]["Opened" | "Deposited" | "Fronted" | "Claimed" | "Closed"]>)[], currentBlock: Block): Promise<void>;
    protected checkEventsEcrowManager(currentBlock: Block, lastProcessedEvent?: {
        blockHash: string;
        logIndex: number;
    }, lastBlockNumber?: number): Promise<[{
        blockHash: string;
        logIndex: number;
    }, number]>;
    protected checkEventsSpvVaults(currentBlock: Block, lastProcessedEvent?: {
        blockHash: string;
        logIndex: number;
    }, lastBlockNumber?: number): Promise<[{
        blockHash: string;
        logIndex: number;
    }, number]>;
    protected checkEvents(lastState: EVMEventListenerState[]): Promise<EVMEventListenerState[]>;
    /**
     * Sets up event handlers listening for swap events over websocket
     *
     * @protected
     */
    protected setupPoll(lastState?: EVMEventListenerState[], saveLatestProcessedBlockNumber?: (newState: EVMEventListenerState[]) => Promise<void>): Promise<void>;
    init(): Promise<void>;
    stop(): Promise<void>;
    registerListener(cbk: EventListener<EVMSwapData>): void;
    unregisterListener(cbk: EventListener<EVMSwapData>): boolean;
}
