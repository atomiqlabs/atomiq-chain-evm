"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMEvents = void 0;
const EVMModule_1 = require("../EVMModule");
class EVMEvents extends EVMModule_1.EVMModule {
    /**
     * Wrapper for provider.getLogs(), automatically retries with smaller ranges if limits are reached
     *
     * @param contract
     * @param topics
     * @param startBlock
     * @param endBlock
     * @private
     */
    async getLogs(contract, topics, startBlock, endBlock) {
        try {
            return await this.root.provider.getLogs({
                address: contract,
                fromBlock: startBlock,
                toBlock: endBlock,
                topics
            });
        }
        catch (e) {
            if ((e.error?.code === -32602 && e.error?.message?.startsWith("query exceeds max results")) || //Query exceeds max results
                e.error?.code === -32008 || //Response is too big
                e.error?.code === -32005 //Limit exceeded
            ) {
                if (startBlock === endBlock)
                    throw e;
                const difference = (endBlock - startBlock) / 2;
                const midpoint = startBlock + Math.floor(difference);
                this.logger.warn(`getLogs(): Error getting logs, limits reached, splitting to 2 ranges: ${startBlock}..${midpoint} & ${midpoint + 1}..${endBlock}: `, e);
                return [
                    ...await this.getLogs(contract, topics, startBlock, midpoint),
                    ...await this.getLogs(contract, topics, midpoint + 1, endBlock),
                ];
            }
            throw e;
        }
    }
    /**
     * Returns the all the events occuring in a block range as identified by the contract and keys
     *
     * @param contract
     * @param topics
     * @param startBlock
     * @param endBlock
     * @param abortSignal
     */
    async getBlockEvents(contract, topics, startBlock, endBlock, abortSignal) {
        startBlock ?? (startBlock = 0);
        let events = [];
        if (startBlock === endBlock) {
            events = await this.root.provider.getLogs({
                address: contract,
                fromBlock: startBlock,
                toBlock: endBlock == null ? this.root.config.safeBlockTag : endBlock,
                topics
            });
        }
        else if (endBlock == null) {
            const safeBlock = await this.root.provider.getBlock(this.root.config.safeBlockTag);
            if (safeBlock == null)
                throw new Error(`Cannot retrieve '${this.root.config.safeBlockTag}' block`);
            if (safeBlock.number - startBlock > this.root.config.maxLogsBlockRange) {
                for (let i = startBlock + this.root.config.maxLogsBlockRange; i < safeBlock.number; i += this.root.config.maxLogsBlockRange) {
                    events.push(...await this.getLogs(contract, topics, i - this.root.config.maxLogsBlockRange, i));
                    startBlock = i;
                }
            }
            events.push(...await this.getLogs(contract, topics, startBlock, safeBlock.number));
        }
        else {
            //Both numeric
            if (endBlock - startBlock > this.root.config.maxLogsBlockRange) {
                for (let i = startBlock + this.root.config.maxLogsBlockRange; i < endBlock; i += this.root.config.maxLogsBlockRange) {
                    events.push(...await this.getLogs(contract, topics, i - this.root.config.maxLogsBlockRange, i));
                    startBlock = i;
                }
            }
            events.push(...await this.getLogs(contract, topics, startBlock, endBlock));
        }
        return events.filter(val => !val.removed);
    }
    /**
     * Runs a search backwards in time, processing events from a specific contract and keys
     *
     * @param contract
     * @param topics
     * @param processor called for every batch of returned signatures, should return a value if the correct signature
     *  was found, or null if the search should continue
     * @param abortSignal
     * @param genesisHeight Height when the contract was deployed
     */
    async findInEvents(contract, topics, processor, abortSignal, genesisHeight) {
        const latestBlock = await this.provider.getBlock(this.root.config.safeBlockTag);
        if (latestBlock == null)
            throw new Error(`Cannot find block ${this.root.config.safeBlockTag}`);
        let promises = [];
        for (let blockNumber = latestBlock.number; blockNumber >= (genesisHeight ?? 0); blockNumber -= this.root.config.maxLogsBlockRange) {
            promises.push(this.getLogs(contract, topics, Math.max(blockNumber - this.root.config.maxLogsBlockRange, 0), blockNumber));
            if (promises.length >= this.root.config.maxParallelLogRequests) {
                const eventsResult = (await Promise.all(promises)).map(arr => arr.reverse() //Oldest events first
                ).flat();
                promises = [];
                if (abortSignal != null)
                    abortSignal.throwIfAborted();
                const result = await processor(eventsResult);
                if (result != null)
                    return result;
            }
        }
        const eventsResult = (await Promise.all(promises)).map(arr => arr.reverse() //Oldest events first
        ).flat();
        if (abortSignal != null)
            abortSignal.throwIfAborted();
        const result = await processor(eventsResult); //Oldest events first
        if (result != null)
            return result;
        return null;
    }
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
    async findInEventsForward(contract, topics, processor, abortSignal, startHeight) {
        const latestBlock = await this.provider.getBlock(this.root.config.safeBlockTag);
        if (latestBlock == null)
            throw new Error(`Cannot find block ${this.root.config.safeBlockTag}`);
        let promises = [];
        for (let blockNumber = startHeight ?? 0; blockNumber < latestBlock.number; blockNumber += this.root.config.maxLogsBlockRange) {
            promises.push(this.getLogs(contract, topics, blockNumber, Math.min(blockNumber + this.root.config.maxLogsBlockRange, latestBlock.number)));
            if (promises.length >= this.root.config.maxParallelLogRequests) {
                const eventsResult = (await Promise.all(promises)).flat();
                promises = [];
                if (abortSignal != null)
                    abortSignal.throwIfAborted();
                const result = await processor(eventsResult); //Oldest events first
                if (result != null)
                    return result;
            }
        }
        const eventsResult = (await Promise.all(promises)).flat();
        if (abortSignal != null)
            abortSignal.throwIfAborted();
        const result = await processor(eventsResult); //Oldest events first
        if (result != null)
            return result;
        return null;
    }
}
exports.EVMEvents = EVMEvents;
