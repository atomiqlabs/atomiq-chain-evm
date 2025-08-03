import { BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer, ChainSwapType } from "@atomiqlabs/base";
import { JsonRpcApiProvider } from "ethers";
import { EVMRetryPolicy } from "../../evm/chain/EVMChainInterface";
import { EVMFees } from "../../evm/chain/modules/EVMFees";
import { BotanixChainType } from "./BotanixChainType";
export type BotanixAssetsType = BaseTokenType<"BBTC">;
export declare const BotanixAssets: BotanixAssetsType;
export type BotanixOptions = {
    rpcUrl: string | JsonRpcApiProvider;
    retryPolicy?: EVMRetryPolicy;
    chainType?: "MAINNET" | "MUTINYNET";
    maxLogsBlockRange?: number;
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
};
export declare function initializeBotanix(options: BotanixOptions, bitcoinRpc: BitcoinRpc<any>, network: BitcoinNetwork): ChainData<BotanixChainType>;
export type BotanixInitializerType = ChainInitializer<BotanixOptions, BotanixChainType, BotanixAssetsType>;
export declare const BotanixInitializer: BotanixInitializerType;
