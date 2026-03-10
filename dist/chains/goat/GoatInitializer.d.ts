import { BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer } from "@atomiqlabs/base";
import { GoatChainType } from "./GoatChainType";
import { EVMOptions } from "../EVMOptions";
/**
 * Token assets available on GOAT Network
 * @category Networks/GOAT
 */
export type GoatAssetsType = BaseTokenType<"BTC" | "PBTC" | "_PBTC_DEV">;
/**
 * Configuration options for initializing GOAT Network chain
 * @category Networks/GOAT
 */
export type GoatOptions = EVMOptions<"MAINNET" | "TESTNET" | "TESTNET4">;
/**
 * Initialize GOAT Network chain integration
 * @category Networks/GOAT
 */
export declare function initializeGoat(options: GoatOptions, bitcoinRpc: BitcoinRpc<any>, network: BitcoinNetwork): ChainData<GoatChainType>;
/**
 * Type definition for the GOAT Network chain initializer
 * @category Networks/GOAT
 */
export type GoatInitializerType = ChainInitializer<GoatOptions, GoatChainType, GoatAssetsType>;
/**
 * GOAT Network chain initializer instance
 * @category Networks/GOAT
 */
export declare const GoatInitializer: GoatInitializerType;
