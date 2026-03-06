import { EVMChainEventsBrowser } from "./EVMChainEventsBrowser";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import { EVMSwapContract } from "../swaps/EVMSwapContract";
import { EVMSpvVaultContract } from "../spv_swap/EVMSpvVaultContract";
/**
 * Backend event listener with persisted polling cursor stored on filesystem.
 *
 * @category Events
 */
export declare class EVMChainEvents extends EVMChainEventsBrowser {
    private readonly directory;
    private readonly BLOCKHEIGHT_FILENAME;
    constructor(directory: string, chainInterface: EVMChainInterface, evmSwapContract: EVMSwapContract, evmSpvVaultContract: EVMSpvVaultContract<any>, pollIntervalSeconds?: number);
    /**
     * Retrieves last signature & slot from filesystem
     *
     * @private
     */
    private getLastEventData;
    /**
     * Saves last signature & slot to the filesystem
     *
     * @private
     */
    private saveLastEventData;
    init(noAutomaticPoll?: boolean): Promise<void>;
}
