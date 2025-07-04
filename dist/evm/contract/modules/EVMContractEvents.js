"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMContractEvents = void 0;
const EVMEvents_1 = require("../../chain/modules/EVMEvents");
class EVMContractEvents extends EVMEvents_1.EVMEvents {
    constructor(chainInterface, contract) {
        super(chainInterface);
        this.contract = contract;
        this.baseContract = contract.contract;
    }
    toTypedEvents(blockEvents) {
        return blockEvents.map(log => this.contract.toTypedEvent(log));
    }
    toFilter(events, keys) {
        const filterArray = [];
        filterArray.push(events.map(name => {
            return this.baseContract.getEvent(name).fragment.topicHash;
        }));
        if (keys != null)
            keys.forEach(key => filterArray.push(key));
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
    async getContractBlockEvents(events, keys, startBlockHeight, endBlockHeight = startBlockHeight) {
        const blockEvents = await super.getBlockEvents(await this.baseContract.getAddress(), this.toFilter(events, keys), startBlockHeight, endBlockHeight);
        return this.toTypedEvents(blockEvents);
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
    async findInContractEvents(events, keys, processor, abortSignal) {
        return this.findInEvents(await this.baseContract.getAddress(), this.toFilter(events, keys), async (events) => {
            const parsedEvents = this.toTypedEvents(events);
            for (let event of parsedEvents) {
                const result = await processor(event);
                if (result != null)
                    return result;
            }
        }, abortSignal, this.contract.contractDeploymentHeight);
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
    async findInContractEventsForward(events, keys, processor, abortSignal) {
        return this.findInEventsForward(await this.baseContract.getAddress(), this.toFilter(events, keys), async (events) => {
            const parsedEvents = this.toTypedEvents(events);
            for (let event of parsedEvents) {
                const result = await processor(event);
                if (result != null)
                    return result;
            }
        }, abortSignal, this.contract.contractDeploymentHeight);
    }
}
exports.EVMContractEvents = EVMContractEvents;
