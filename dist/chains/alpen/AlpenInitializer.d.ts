import { BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer, ChainSwapType } from "@atomiqlabs/base";
import { JsonRpcApiProvider } from "ethers";
import { EVMConfiguration, EVMRetryPolicy } from "../../evm/chain/EVMChainInterface";
import { EVMFees } from "../../evm/chain/modules/EVMFees";
import { AlpenChainType } from "./AlpenChainType";
/**
 * Token assets available on Alpen
 * @category Networks/Alpen
 */
export type AlpenAssetsType = BaseTokenType<"BTC">;
/**
 * Default Alpen token assets configuration
 * @category Networks/Alpen
 */
export declare const AlpenAssets: AlpenAssetsType;
/**
 * Configuration options for initializing Alpen chain
 * @category Networks/Alpen
 */
export type AlpenOptions = {
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
