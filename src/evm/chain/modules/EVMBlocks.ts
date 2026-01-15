import {EVMModule} from "../EVMModule";
import {Block} from "ethers";

export type EVMBlockTag = "safe" | "pending" | "latest" | "finalized";

/**
 * @category Chain
 */
export class EVMBlocks extends EVMModule<any> {

    private BLOCK_CACHE_TIME = 5*1000;

    private blockCache: {
        [key: string]: {
            block: Promise<Block>,
            timestamp: number
        }
    } = {};

    /**
     * Initiates fetch of a given block & saves it to cache
     *
     * @private
     * @param blockTag
     */
    private fetchAndSaveBlockTime(blockTag: EVMBlockTag | number): {
        block: Promise<Block>,
        timestamp: number
    } {
        const blockTagStr = blockTag.toString(10);

        const blockPromise = this.provider.getBlock(blockTag, false).then((block) => {
            if(block==null) throw new Error(`Failed to fetch '${blockTag}' block!`);
            return block;
        });
        const timestamp = Date.now();
        this.blockCache[blockTagStr] = {
            block: blockPromise,
            timestamp
        };
        blockPromise.catch(() => {
            if(this.blockCache[blockTagStr]!=null && this.blockCache[blockTagStr].block===blockPromise) delete this.blockCache[blockTagStr];
        })
        return {
            block: blockPromise,
            timestamp
        };
    }

    private cleanupBlocks() {
        const currentTime = Date.now();
        //Keys are in order that they were added, so we can stop at the first non-expired block
        for(let key in this.blockCache) {
            const block = this.blockCache[key];
            if(currentTime - block.timestamp > this.BLOCK_CACHE_TIME) {
                delete this.blockCache[key];
            } else {
                break;
            }
        }
    }

    ///////////////////
    //// Blocks
    /**
     * Gets the block for a given blocktag, with caching
     *
     * @param blockTag
     */
    public getBlock(blockTag: EVMBlockTag | number): Promise<Block> {
        this.cleanupBlocks();
        let cachedBlockData = this.blockCache[blockTag.toString(10)];

        if(cachedBlockData==null || Date.now()-cachedBlockData.timestamp>this.BLOCK_CACHE_TIME) {
            cachedBlockData = this.fetchAndSaveBlockTime(blockTag);
        }

        return cachedBlockData.block;
    }

    /**
     * Gets the block time for a given blocktag, with caching
     *
     * @param blockTag
     */
    public async getBlockTime(blockTag: EVMBlockTag | number): Promise<number> {
        const block = await this.getBlock(blockTag);
        return block.timestamp;
    }

}
