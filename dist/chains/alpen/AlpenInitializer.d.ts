import { BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer } from "@atomiqlabs/base";
import { AlpenChainType } from "./AlpenChainType";
import { EVMOptions } from "../EVMOptions";
/**
 * Token assets available on Alpen
 * @category Networks/Alpen
 */
export type AlpenAssetsType = BaseTokenType<"BTC">;
/**
 * Configuration options for initializing Alpen chain
 * @category Networks/Alpen
 */
export type AlpenOptions = EVMOptions<"MAINNET" | "TESTNET" | "TESTNET4">;
/**
 * Initialize Alpen chain integration
 * @category Networks/Alpen
 */
export declare function initializeAlpen(options: AlpenOptions, bitcoinRpc: BitcoinRpc<any>, network: BitcoinNetwork): ChainData<AlpenChainType>;
/**
 * Type definition for the Alpen chain initializer
 * @category Networks/Alpen
 */
export type AlpenInitializerType = ChainInitializer<AlpenOptions, AlpenChainType, AlpenAssetsType>;
/**
 * Alpen chain initializer instance
 * @category Networks/Alpen
 */
export declare const AlpenInitializer: AlpenInitializerType;
