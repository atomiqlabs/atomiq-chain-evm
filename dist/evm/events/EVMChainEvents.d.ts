import { EVMChainEventsBrowser } from "./EVMChainEventsBrowser";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import { EVMSwapContract } from "../swaps/EVMSwapContract";
import { EVMSpvVaultContract } from "../spv_swap/EVMSpvVaultContract";
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
    init(): Promise<void>;
}
