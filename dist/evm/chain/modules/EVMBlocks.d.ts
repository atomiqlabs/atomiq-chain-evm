import { EVMModule } from "../EVMModule";
import { Block } from "ethers";
export type EVMBlockTag = "safe" | "pending" | "latest" | "finalized";
/**
 * @category Chain
 */
export declare class EVMBlocks extends EVMModule<any> {
    private BLOCK_CACHE_TIME;
    private blockCache;
    /**
     * Initiates fetch of a given block & saves it to cache
     *
     * @private
     * @param blockTag
     */
    private fetchAndSaveBlockTime;
    private cleanupBlocks;
    /**
     * Gets the block for a given blocktag, with caching
     *
     * @param blockTag
     */
    getBlock(blockTag: EVMBlockTag | number): Promise<Block>;
    /**
     * Gets the block time for a given blocktag, with caching
     *
     * @param blockTag
     */
    getBlockTime(blockTag: EVMBlockTag | number): Promise<number>;
}
