import {EVMModule} from "../EVMModule";
import {Log} from "ethers";

export class EVMEvents extends EVMModule<any> {

    public readonly MAX_BLOCK_RANGE = 500;

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
            if(safeBlock.number - startBlock > this.MAX_BLOCK_RANGE) {
                for(let i = startBlock + this.MAX_BLOCK_RANGE; i < safeBlock.number; i += this.MAX_BLOCK_RANGE) {
                    events.push(...await this.root.provider.getLogs({
                        address: contract,
                        fromBlock: i - this.MAX_BLOCK_RANGE,
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
            if(endBlock - startBlock > this.MAX_BLOCK_RANGE) {
                for(let i = startBlock + this.MAX_BLOCK_RANGE; i < endBlock; i += this.MAX_BLOCK_RANGE) {
                    events.push(...await this.root.provider.getLogs({
                        address: contract,
                        fromBlock: i - this.MAX_BLOCK_RANGE,
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

        for(let blockNumber = latestBlockNumber; blockNumber >= 0; blockNumber-=this.MAX_BLOCK_RANGE) {
            const eventsResult = await this.provider.getLogs({
                address: contract,
                topics,
                fromBlock: Math.max(blockNumber-this.MAX_BLOCK_RANGE, 0),
                toBlock: blockNumber===latestBlockNumber ? this.root.config.safeBlockTag : blockNumber
            });

            abortSignal.throwIfAborted();

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
     */
    public async findInEventsForward<T>(
        contract: string, topics: (string[] | string | null)[],
        processor: (signatures: Log[]) => Promise<T>,
        abortSignal?: AbortSignal
    ): Promise<T> {
        const {number: latestBlockNumber} = await this.provider.getBlock(this.root.config.safeBlockTag);

        for(let blockNumber = 0; blockNumber < latestBlockNumber; blockNumber += this.MAX_BLOCK_RANGE) {
            const eventsResult = await this.provider.getLogs({
                address: contract,
                topics,
                fromBlock: blockNumber,
                toBlock: (blockNumber + this.MAX_BLOCK_RANGE) > latestBlockNumber ? this.root.config.safeBlockTag : blockNumber + this.MAX_BLOCK_RANGE
            });

            abortSignal.throwIfAborted();

            const result: T = await processor(eventsResult); //Oldest events first
            if(result!=null) return result;
        }

        return null;
    }

}
