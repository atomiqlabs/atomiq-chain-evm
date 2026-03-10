import { BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer } from "@atomiqlabs/base";
import { CitreaChainType } from "./CitreaChainType";
import { CitreaFees } from "./CitreaFees";
import { EVMOptions } from "../EVMOptions";
/**
 * Token assets available on Citrea
 * @category Networks/Citrea
 */
export type CitreaAssetsType = BaseTokenType<"CBTC" | "WBTC" | "USDC">;
/**
 * Configuration options for initializing Citrea chain
 * @category Networks/Citrea
 */
export type CitreaOptions = EVMOptions<"MAINNET" | "TESTNET4", CitreaFees>;
/**
 * Initialize Citrea chain integration
 * @category Networks/Citrea
 */
export declare function initializeCitrea(options: CitreaOptions, bitcoinRpc: BitcoinRpc<any>, network: BitcoinNetwork): ChainData<CitreaChainType>;
/**
 * Type definition for the Citrea chain initializer
 * @category Networks/Citrea
 */
export type CitreaInitializerType = ChainInitializer<CitreaOptions, CitreaChainType, CitreaAssetsType>;
/**
 * Citrea chain initializer instance
 * @category Networks/Citrea
 */
export declare const CitreaInitializer: CitreaInitializerType;
