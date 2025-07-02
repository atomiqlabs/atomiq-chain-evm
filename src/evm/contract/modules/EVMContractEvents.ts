import {BaseContract, Log} from "ethers";
import {EVMEvents} from "../../chain/modules/EVMEvents";
import {EVMContractBase} from "../EVMContractBase";
import {EVMChainInterface} from "../../chain/EVMChainInterface";
import {TypedEventLog} from "../../typechain/common";

export class EVMContractEvents<T extends BaseContract> extends EVMEvents {

    readonly contract: EVMContractBase<T>;
    readonly baseContract: T;

    constructor(chainInterface: EVMChainInterface<any>, contract: EVMContractBase<T>) {
        super(chainInterface);
        this.contract = contract;
        this.baseContract = contract.contract;
    }

    private toTypedEvents<TEventName extends keyof T["filters"]>(blockEvents: Log[]): TypedEventLog<T["filters"][TEventName]>[] {
        return blockEvents.map(log => this.contract.toTypedEvent<TEventName>(log));
    }

    private toFilter<TEventName extends keyof T["filters"]>(
        events: TEventName[],
        keys: string[],
    ): (string | string[])[] {
        const filterArray: (string | string[])[] = [];
        filterArray.push(events.map(name => {
            return this.baseContract.getEvent(name as string).fragment.topicHash;
        }));
        if(keys!=null) keys.forEach(key => filterArray.push(key));
        return filterArray;
    }

    /**
     * Returns the events occuring in a range of EVM blocks as identified by the contract and keys,
     *  returns pending events if no startHeight & endHeight is passed
     *
     * @param events
     * @param keys
     * @param startBlockHeight
     * @param endBlockHeight
     */
    public async getContractBlockEvents<TEventName extends keyof T["filters"]>(
        events: TEventName[],
        keys: string[],
        startBlockHeight?: number,
        endBlockHeight: number = startBlockHeight
    ): Promise<TypedEventLog<T["filters"][TEventName]>[]> {
        const blockEvents = await super.getBlockEvents(await this.baseContract.getAddress(), this.toFilter(events, keys), startBlockHeight, endBlockHeight);
        return this.toTypedEvents<TEventName>(blockEvents);
    }

    /**
     * Runs a search backwards in time, processing the events for a specific topic public key
     *
     * @param events
     * @param keys
     * @param processor called for every event, should return a value if the correct event was found, or null
     *  if the search should continue
     * @param abortSignal
     */
    public async findInContractEvents<TResult, TEventName extends keyof T["filters"]>(
        events: TEventName[],
        keys: string[],
        processor: (event: TypedEventLog<T["filters"][TEventName]>) => Promise<TResult>,
        abortSignal?: AbortSignal
    ): Promise<TResult> {
        return this.findInEvents<TResult>(await this.baseContract.getAddress(), this.toFilter(events, keys), async (events: Log[]) => {
            const parsedEvents = this.toTypedEvents<TEventName>(events);
            for(let event of parsedEvents) {
                const result: TResult = await processor(event);
                if(result!=null) return result;
            }
        }, abortSignal);
    }

    /**
     * Runs a search forwards in time, processing the events for a specific topic
     *
     * @param events
     * @param keys
     * @param processor called for every event, should return a value if the correct event was found, or null
     *  if the search should continue
     * @param abortSignal
     */
    public async findInContractEventsForward<TResult, TEventName extends keyof T["filters"]>(
        events: TEventName[],
        keys: string[],
        processor: (event: TypedEventLog<T["filters"][TEventName]>) => Promise<TResult>,
        abortSignal?: AbortSignal
    ): Promise<TResult> {
        return this.findInEventsForward<TResult>(await this.baseContract.getAddress(), this.toFilter(events, keys), async (events: Log[]) => {
            const parsedEvents = this.toTypedEvents<TEventName>(events);
            for(let event of parsedEvents) {
                const result: TResult = await processor(event);
                if(result!=null) return result;
            }
        }, abortSignal);
    }

}

