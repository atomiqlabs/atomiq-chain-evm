"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMChainEvents = void 0;
//@ts-ignore
const fs = require("fs/promises");
const EVMChainEventsBrowser_1 = require("./EVMChainEventsBrowser");
class EVMChainEvents extends EVMChainEventsBrowser_1.EVMChainEventsBrowser {
    constructor(directory, chainInterface, evmSwapContract, evmSpvVaultContract, pollIntervalSeconds) {
        super(chainInterface, evmSwapContract, evmSpvVaultContract, pollIntervalSeconds);
        this.BLOCKHEIGHT_FILENAME = "/" + chainInterface.chainId + "-blockheight.txt";
        this.directory = directory;
    }
    /**
     * Retrieves last signature & slot from filesystem
     *
     * @private
     */
    async getLastEventData() {
        try {
            const txt = (await fs.readFile(this.directory + this.BLOCKHEIGHT_FILENAME)).toString();
            const arr = txt.split(";");
            return arr.map(val => {
                const stateResult = val.split(",");
                if (stateResult.length >= 3) {
                    const lastBlockNumber = parseInt(stateResult[0]);
                    const logIndex = parseInt(stateResult[2]);
                    if (isNaN(lastBlockNumber) || isNaN(logIndex))
                        throw new Error();
                    return {
                        lastBlockNumber,
                        lastEvent: {
                            blockHash: stateResult[1],
                            logIndex
                        }
                    };
                }
                else if (stateResult.length >= 1) {
                    if (stateResult[0] === "null")
                        return null;
                    const lastBlockNumber = parseInt(stateResult[0]);
                    if (isNaN(lastBlockNumber))
                        throw new Error();
                    return {
                        lastBlockNumber
                    };
                }
                else {
                    return null;
                }
            });
        }
        catch (e) {
            return undefined;
        }
    }
    /**
     * Saves last signature & slot to the filesystem
     *
     * @private
     */
    saveLastEventData(newState) {
        return fs.writeFile(this.directory + this.BLOCKHEIGHT_FILENAME, newState.map(val => {
            if (val == null)
                return "null";
            if (val.lastEvent == null) {
                return val.lastBlockNumber.toString(10);
            }
            else {
                return val.lastBlockNumber.toString(10) + "," + val.lastEvent.blockHash + "," + val.lastEvent.logIndex.toString(10);
            }
        }).join(";"));
    }
    async init(noAutomaticPoll) {
        if (noAutomaticPoll)
            return Promise.resolve();
        this.stopped = false;
        const lastState = await this.getLastEventData();
        if (this.provider.websocket != null)
            await this.setupWebsocket();
        await this.setupPoll(lastState, (newState) => this.saveLastEventData(newState));
    }
}
exports.EVMChainEvents = EVMChainEvents;
