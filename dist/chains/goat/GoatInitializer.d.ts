import { BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer, ChainSwapType } from "@atomiqlabs/base";
import { JsonRpcApiProvider } from "ethers";
import { EVMConfiguration, EVMRetryPolicy } from "../../evm/chain/EVMChainInterface";
import { EVMFees } from "../../evm/chain/modules/EVMFees";
import { GoatChainType } from "./GoatChainType";
export type GoatAssetsType = BaseTokenType<"BTC" | "PBTC" | "_PBTC_DEV">;
export declare const GoatAssets: GoatAssetsType;
export type GoatOptions = {
    rpcUrl: string | JsonRpcApiProvider;
    retryPolicy?: EVMRetryPolicy;
    chainType?: "MAINNET" | "TESTNET" | "TESTNET4";
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
export declare function initializeGoat(options: GoatOptions, bitcoinRpc: BitcoinRpc<any>, network: BitcoinNetwork): ChainData<GoatChainType>;
export type GoatInitializerType = ChainInitializer<GoatOptions, GoatChainType, GoatAssetsType>;
export declare const GoatInitializer: GoatInitializerType;
