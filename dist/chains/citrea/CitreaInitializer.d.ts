import { BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer, ChainSwapType } from "@atomiqlabs/base";
import { JsonRpcApiProvider } from "ethers";
import { EVMConfiguration, EVMRetryPolicy } from "../../evm/chain/EVMChainInterface";
import { CitreaChainType } from "./CitreaChainType";
import { CitreaFees } from "./CitreaFees";
/**
 * Token assets available on Citrea
 * @category Networks/Citrea
 */
export type CitreaAssetsType = BaseTokenType<"CBTC" | "WBTC" | "USDC">;
/**
 * Default Citrea token assets configuration
 * @category Networks/Citrea
 */
export declare const CitreaAssets: CitreaAssetsType;
/**
 * Configuration options for initializing Citrea chain
 * @category Networks/Citrea
 */
export type CitreaOptions = {
    rpcUrl: string | JsonRpcApiProvider;
    retryPolicy?: EVMRetryPolicy;
    chainType?: "MAINNET" | "TESTNET4";
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
    fees?: CitreaFees;
    evmConfig?: Omit<EVMConfiguration, "safeBlockTag" | "finalizedBlockTag">;
};
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
