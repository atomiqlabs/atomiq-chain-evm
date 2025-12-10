import { BaseContract, Log } from "ethers";
import { EVMEvents } from "../../chain/modules/EVMEvents";
import { EVMContractBase } from "../EVMContractBase";
import { EVMChainInterface } from "../../chain/EVMChainInterface";
import { TypedEventLog } from "../../typechain/common";
export declare class EVMContractEvents<T extends BaseContract> extends EVMEvents {
    readonly contract: EVMContractBase<T>;
    readonly baseContract: T;
    constructor(chainInterface: EVMChainInterface<any>, contract: EVMContractBase<T>);
    toTypedEvents<TEventName extends keyof T["filters"]>(blockEvents: Log[]): (TypedEventLog<T["filters"][TEventName]> | null)[];
    private toFilter;
    /**
     * Returns the events occuring in a range of EVM blocks as identified by the contract and keys,
     *  returns pending events if no startHeight & endHeight is passed
     *
     * @param events
     * @param keys
     * @param startBlockHeight
     * @param endBlockHeight
     */
    getContractBlockEvents<TEventName extends keyof T["filters"]>(events: TEventName[], keys: (string | null)[], startBlockHeight?: number, endBlockHeight?: number): Promise<TypedEventLog<T["filters"][TEventName]>[]>;
    /**
     * Runs a search backwards in time, processing the events for a specific topic public key
     *
     * @param events
     * @param keys
     * @param processor called for every event, should return a value if the correct event was found, or null
     *  if the search should continue
     * @param abortSignal
     */
    findInContractEvents<TResult, TEventName extends keyof T["filters"]>(events: TEventName[], keys: null | (null | string | string[])[], processor: (event: TypedEventLog<T["filters"][TEventName]>) => Promise<TResult | null>, abortSignal?: AbortSignal): Promise<TResult | null>;
    /**
     * Runs a search forwards in time, processing the events for a specific topic
     *
     * @param events
     * @param keys
     * @param processor called for every event, should return a value if the correct event was found, or null
     *  if the search should continue
     * @param startHeight
     * @param abortSignal
     */
    findInContractEventsForward<TResult, TEventName extends keyof T["filters"]>(events: TEventName[], keys: null | (null | string | string[])[], processor: (event: TypedEventLog<T["filters"][TEventName]>) => Promise<TResult | null>, startHeight?: number, abortSignal?: AbortSignal): Promise<TResult | null>;
}
