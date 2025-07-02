import { BaseTokenType, BitcoinNetwork, BitcoinRpc, ChainData, ChainInitializer, ChainSwapType } from "@atomiqlabs/base";
import { JsonRpcApiProvider } from "ethers";
import { EVMRetryPolicy } from "../../evm/chain/EVMChainInterface";
import { EVMFees } from "../../evm/chain/modules/EVMFees";
import { CitreaChainType } from "./CitreaChainType";
export type CitreaAssetsType = BaseTokenType<"CBTC">;
export declare const CitreaAssets: CitreaAssetsType;
export type CitreaOptions = {
    rpcUrl: string | JsonRpcApiProvider;
    retryPolicy?: EVMRetryPolicy;
    chainType?: "MAINNET" | "TESTNET4";
    maxLogsBlockRange?: number;
    swapContract?: string;
    btcRelayContract?: string;
    spvVaultContract?: string;
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
export declare function initializeCitrea(options: CitreaOptions, bitcoinRpc: BitcoinRpc<any>, network: BitcoinNetwork): ChainData<CitreaChainType>;
export type CitreaInitializerType = ChainInitializer<CitreaOptions, CitreaChainType, CitreaAssetsType>;
export declare const CitreaInitializer: CitreaInitializerType;
