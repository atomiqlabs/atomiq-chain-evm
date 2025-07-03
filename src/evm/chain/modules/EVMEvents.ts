import {EVMModule} from "../EVMModule";
import {Log} from "ethers";

export class EVMEvents extends EVMModule<any> {

    /**
     * Returns the all the events occuring in a block range as identified by the contract and keys
     *
     * @param contract
     * @param topics
     * @param startBlock
     * @param endBlock
     * @param abortSignal
     */
    public async getBlockEvents(
        contract: string, topics: (string[] | string | null)[], startBlock?: number, endBlock: number = startBlock, abortSignal?: AbortSignal
    ): Promise<Log[]> {
        let events: Log[] = [];

        if(startBlock===endBlock) {
            events = await this.root.provider.getLogs({
                address: contract,
                fromBlock: startBlock==null ? this.root.config.safeBlockTag : startBlock,
                toBlock: endBlock==null ? this.root.config.safeBlockTag : endBlock,
                topics
            });
        } else if(endBlock==null) {
            const safeBlock = await this.root.provider.getBlock(this.root.config.safeBlockTag);
            if(safeBlock.number - startBlock > this.root.config.maxLogsBlockRange) {
                for(let i = startBlock + this.root.config.maxLogsBlockRange; i < safeBlock.number; i += this.root.config.maxLogsBlockRange) {
                    events.push(...await this.root.provider.getLogs({
                        address: contract,
                        fromBlock: i - this.root.config.maxLogsBlockRange,
                        toBlock: i,
                        topics
                    }));
                    startBlock = i;
                }
            }
            events.push(...await this.root.provider.getLogs({
                address: contract,
                fromBlock: startBlock==null ? this.root.config.safeBlockTag : startBlock,
                toBlock: endBlock==null ? this.root.config.safeBlockTag : endBlock,
                topics
            }));
        } else {
            //Both numeric
            if(endBlock - startBlock > this.root.config.maxLogsBlockRange) {
                for(let i = startBlock + this.root.config.maxLogsBlockRange; i < endBlock; i += this.root.config.maxLogsBlockRange) {
                    events.push(...await this.root.provider.getLogs({
                        address: contract,
                        fromBlock: i - this.root.config.maxLogsBlockRange,
                        toBlock: i,
                        topics
                    }));
                    startBlock = i;
                }
            }
            events.push(...await this.root.provider.getLogs({
                address: contract,
                fromBlock: startBlock,
                toBlock: endBlock,
                topics
            }));
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
     */
    public async findInEvents<T>(
        contract: string, topics: (string[] | string | null)[],
        processor: (signatures: Log[]) => Promise<T>,
        abortSignal?: AbortSignal
    ): Promise<T> {
        const {number: latestBlockNumber} = await this.provider.getBlock(this.root.config.safeBlockTag);

        for(let blockNumber = latestBlockNumber; blockNumber >= 0; blockNumber-=this.root.config.maxLogsBlockRange) {
            const eventsResult = await this.provider.getLogs({
                address: contract,
                topics,
                fromBlock: Math.max(blockNumber-this.root.config.maxLogsBlockRange, 0),
                toBlock: blockNumber===latestBlockNumber ? this.root.config.safeBlockTag : blockNumber
            });

            if(abortSignal!=null) abortSignal.throwIfAborted();

            const result: T = await processor(eventsResult.reverse()); //Newest events first
            if(result!=null) return result;
        }
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
    public async findInEventsForward<T>(
        contract: string, topics: (string[] | string | null)[],
        processor: (signatures: Log[]) => Promise<T>,
        abortSignal?: AbortSignal,
        startHeight?: number
    ): Promise<T> {
        const {number: latestBlockNumber} = await this.provider.getBlock(this.root.config.safeBlockTag);

        for(let blockNumber = startHeight ?? 0; blockNumber < latestBlockNumber; blockNumber += this.root.config.maxLogsBlockRange) {
            const eventsResult = await this.provider.getLogs({
                address: contract,
                topics,
                fromBlock: blockNumber,
                toBlock: (blockNumber + this.root.config.maxLogsBlockRange) > latestBlockNumber ? this.root.config.safeBlockTag : blockNumber + this.root.config.maxLogsBlockRange
            });

            if(abortSignal!=null) abortSignal.throwIfAborted();

            const result: T = await processor(eventsResult); //Oldest events first
            if(result!=null) return result;
        }

        return null;
    }

}
