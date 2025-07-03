import { EVMModule } from "../EVMModule";
import { Log } from "ethers";
export declare class EVMEvents extends EVMModule<any> {
    /**
     * Returns the all the events occuring in a block range as identified by the contract and keys
     *
     * @param contract
     * @param topics
     * @param startBlock
     * @param endBlock
     * @param abortSignal
     */
    getBlockEvents(contract: string, topics: (string[] | string | null)[], startBlock?: number, endBlock?: number, abortSignal?: AbortSignal): Promise<Log[]>;
    /**
     * Runs a search backwards in time, processing events from a specific contract and keys
     *
     * @param contract
     * @param topics
     * @param processor called for every batch of returned signatures, should return a value if the correct signature
     *  was found, or null if the search should continue
     * @param abortSignal
     */
    findInEvents<T>(contract: string, topics: (string[] | string | null)[], processor: (signatures: Log[]) => Promise<T>, abortSignal?: AbortSignal): Promise<T>;
    /**
     * Runs a search forwards in time, processing events from a specific contract and keys
     *
     * @param contract
     * @param topics
     * @param processor called for every batch of returned signatures, should return a value if the correct signature
     *  was found, or null if the search should continue
     * @param abortSignal
     * @param startHeight Blockheight at which to start
     */
    findInEventsForward<T>(contract: string, topics: (string[] | string | null)[], processor: (signatures: Log[]) => Promise<T>, abortSignal?: AbortSignal, startHeight?: number): Promise<T>;
}
