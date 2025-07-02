//@ts-ignore
import * as fs from "fs/promises";
import {EVMChainEventsBrowser, EVMEventListenerState} from "./EVMChainEventsBrowser";
import {EVMChainInterface} from "../chain/EVMChainInterface";
import {EVMSwapContract} from "../swaps/EVMSwapContract";
import {EVMSpvVaultContract} from "../spv_swap/EVMSpvVaultContract";

const BLOCKHEIGHT_FILENAME = "/evm-blockheight.txt";

export class EVMChainEvents extends EVMChainEventsBrowser {

    private readonly directory: string;

    constructor(
        directory: string,
        chainInterface: EVMChainInterface,
        evmSwapContract: EVMSwapContract,
        evmSpvVaultContract: EVMSpvVaultContract<any>,
        pollIntervalSeconds?: number
    ) {
        super(chainInterface, evmSwapContract, evmSpvVaultContract, pollIntervalSeconds);
        this.directory = directory;
    }

    /**
     * Retrieves last signature & slot from filesystem
     *
     * @private
     */
    private async getLastEventData(): Promise<EVMEventListenerState[]> {
        try {
            const txt: string = (await fs.readFile(this.directory+BLOCKHEIGHT_FILENAME)).toString();
            const arr = txt.split(";");
            return arr.map(val => {
                const stateResult = val.split(",");
                if(stateResult.length>=3) {
                    return {
                        lastBlockNumber: parseInt(stateResult[0]),
                        lastEvent: {
                            blockHash: stateResult[1],
                            logIndex: parseInt(stateResult[2])
                        }
                    };
                } else if(stateResult.length>=1) {
                    return {
                        lastBlockNumber: parseInt(stateResult[0])
                    }
                } else {
                    return null;
                }
            });
        } catch (e) {
            return null;
        }
    }

    /**
     * Saves last signature & slot to the filesystem
     *
     * @private
     */
    private saveLastEventData(newState: EVMEventListenerState[]): Promise<void> {
        return fs.writeFile(this.directory+BLOCKHEIGHT_FILENAME, newState.map(val => {
            if(val.lastEvent==null) {
                return val.lastBlockNumber.toString(10);
            } else {
                return val.lastBlockNumber.toString(10)+","+val.lastEvent.blockHash+","+val.lastEvent.logIndex.toString(10);
            }
        }).join(";"));
    }

    async init(): Promise<void> {
        const lastState = await this.getLastEventData();
        await this.setupPoll(
            lastState,
            (newState: EVMEventListenerState[]) => this.saveLastEventData(newState)
        );
    }

}
