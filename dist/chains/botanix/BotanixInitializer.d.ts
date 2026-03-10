import { BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer } from "@atomiqlabs/base";
import { BotanixChainType } from "./BotanixChainType";
import { EVMOptions } from "../EVMOptions";
/**
 * Token assets available on Botanix
 * @category Networks/Botanix
 */
export type BotanixAssetsType = BaseTokenType<"BTC">;
/**
 * Configuration options for initializing Botanix chain
 * @category Networks/Botanix
 */
export type BotanixOptions = EVMOptions<"MAINNET" | "TESTNET">;
/**
 * Initialize Botanix chain integration
 * @category Networks/Botanix
 */
export declare function initializeBotanix(options: BotanixOptions, bitcoinRpc: BitcoinRpc<any>, network: BitcoinNetwork): ChainData<BotanixChainType>;
/**
 * Type definition for the Botanix chain initializer
 * @category Networks/Botanix
 */
export type BotanixInitializerType = ChainInitializer<BotanixOptions, BotanixChainType, BotanixAssetsType>;
/**
 * Botanix chain initializer instance
 * @category Networks/Botanix
 */
export declare const BotanixInitializer: BotanixInitializerType;
