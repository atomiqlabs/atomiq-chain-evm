import { BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer, ChainSwapType } from "@atomiqlabs/base";
import { JsonRpcApiProvider } from "ethers";
import { EVMConfiguration, EVMRetryPolicy } from "../../evm/chain/EVMChainInterface";
import { EVMFees } from "../../evm/chain/modules/EVMFees";
import { BotanixChainType } from "./BotanixChainType";
/**
 * Token assets available on Botanix
 * @category Networks/Botanix
 */
export type BotanixAssetsType = BaseTokenType<"BTC">;
/**
 * Default Botanix token assets configuration
 * @category Networks/Botanix
 */
export declare const BotanixAssets: BotanixAssetsType;
/**
 * Configuration options for initializing Botanix chain
 * @category Networks/Botanix
 */
export type BotanixOptions = {
    rpcUrl: string | JsonRpcApiProvider;
    retryPolicy?: EVMRetryPolicy;
    chainType?: "MAINNET" | "TESTNET";
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
