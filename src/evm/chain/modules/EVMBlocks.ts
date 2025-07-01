import {EVMModule} from "../EVMModule";

export type EVMBlockTag = "safe" | "pending" | "latest" | "finalized";

export class EVMBlocks extends EVMModule<any> {

    private BLOCK_CACHE_TIME = 5*1000;

    private blockCache: {
        [key in EVMBlockTag]?: {
            blockTime: Promise<number>,
            timestamp: number
        }
    } = {};

    /**
     * Initiates fetch of a given block & saves it to cache
     *
     * @private
     * @param blockTag
     */
    private fetchAndSaveBlockTime(blockTag: EVMBlockTag): {
        blockTime: Promise<number>,
        timestamp: number
    } {
        const blockTimePromise = this.provider.getBlock(blockTag, false).then(result => result.timestamp);
        const timestamp = Date.now();
        this.blockCache[blockTag] = {
            blockTime: blockTimePromise,
            timestamp
        };
        blockTimePromise.catch(e => {
            if(this.blockCache[blockTag]!=null && this.blockCache[blockTag].blockTime===blockTimePromise) delete this.blockCache[blockTag];
            throw e;
        })
        return {
            blockTime: blockTimePromise,
            timestamp
        };
    }

    ///////////////////
    //// Slots
    /**
     * Gets the block for a given blocktag, with caching
     *
     * @param blockTag
     */
    public getBlockTime(blockTag: EVMBlockTag): Promise<number> {
        let cachedBlockData = this.blockCache[blockTag];

        if(cachedBlockData==null || Date.now()-cachedBlockData.timestamp>this.BLOCK_CACHE_TIME) {
            cachedBlockData = this.fetchAndSaveBlockTime(blockTag);
        }

        return cachedBlockData.blockTime;
    }

}
