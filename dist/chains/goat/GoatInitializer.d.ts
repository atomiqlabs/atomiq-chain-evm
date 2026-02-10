import { BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer, ChainSwapType } from "@atomiqlabs/base";
import { JsonRpcApiProvider } from "ethers";
import { EVMConfiguration, EVMRetryPolicy } from "../../evm/chain/EVMChainInterface";
import { EVMFees } from "../../evm/chain/modules/EVMFees";
import { GoatChainType } from "./GoatChainType";
/**
 * Token assets available on GOAT Network
 * @category Networks/GOAT
 */
export type GoatAssetsType = BaseTokenType<"BTC" | "PBTC" | "_PBTC_DEV">;
/**
 * Default GOAT Network token assets configuration
 * @category Networks/GOAT
 */
export declare const GoatAssets: GoatAssetsType;
/**
 * Configuration options for initializing GOAT Network chain
 * @category Networks/GOAT
 */
export type GoatOptions = {
    rpcUrl: string | JsonRpcApiProvider;
    retryPolicy?: EVMRetryPolicy;
    chainType?: "MAINNET" | "TESTNET" | "TESTNET4";
    swapContract?: string;
    swapContractDeploymentHeight?: number;
    btcRelayContract?: string;
    btcRelayDeploymentHeight?: number;
    spvVaultContract?: string;
    spvVaultDeploymentHeight?: number;
    handlerContracts?: {
        refund?: {
            timelock?: string;
        };
        claim?: {
            [type in ChainSwapType]?: string;
        };
    };
    fees?: EVMFees;
    evmConfig?: Omit<EVMConfiguration, "safeBlockTag" | "finalizedBlockTag">;
};
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
