import { BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer, ChainSwapType } from "@atomiqlabs/base";
import { JsonRpcApiProvider } from "ethers";
import { EVMConfiguration, EVMRetryPolicy } from "../../evm/chain/EVMChainInterface";
import { EVMFees } from "../../evm/chain/modules/EVMFees";
import { AlpenChainType } from "./AlpenChainType";
export type AlpenAssetsType = BaseTokenType<"ABTC">;
export declare const AlpenAssets: AlpenAssetsType;
export type AlpenOptions = {
    rpcUrl: string | JsonRpcApiProvider;
    retryPolicy?: EVMRetryPolicy;
    chainType?: "MAINNET" | "TESTNET";
    swapContract?: string;
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
export declare function initializeAlpen(options: AlpenOptions, bitcoinRpc: BitcoinRpc<any>, network: BitcoinNetwork): ChainData<AlpenChainType>;
export type AlpenInitializerType = ChainInitializer<AlpenOptions, AlpenChainType, AlpenAssetsType>;
export declare const AlpenInitializer: AlpenInitializerType;
