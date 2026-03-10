import { JsonRpcApiProvider } from "ethers";
import { EVMConfiguration, EVMRetryPolicy } from "../evm/chain/EVMChainInterface";
import { ChainSwapType } from "@atomiqlabs/base";
import { EVMFees } from "../evm/chain/modules/EVMFees";
/**
 * Generic options for an EVM chain
 *
 * @category Chain Interface
 */
export type EVMOptions<C extends string, F extends EVMFees = EVMFees> = {
    /**
     * EVM RPC URL or {@link JsonRpcApiProvider} object to use for EVM network access
     */
    rpcUrl: string | JsonRpcApiProvider;
    /**
     * Retry policy for the RPC calls
     */
    retryPolicy?: EVMRetryPolicy;
    /**
     * Network type for the EVM chain
     */
    chainType?: C;
    /**
     * Contract address of the Escrow Manager contract, uses canonical deployment by default
     */
    swapContract?: string;
    /**
     * Optional Escrow Manager contract deployment height, which acts as genesis when querying events
     */
    swapContractDeploymentHeight?: number;
    /**
     * Contract address of the BTC Relay contract, uses canonical deployment by default
     */
    btcRelayContract?: string;
    /**
     * Optional BTC Relay contract deployment height, which acts as genesis when querying events
     */
    btcRelayDeploymentHeight?: number;
    /**
     * Contract address of the UTXO-controlled vault (SPV Vault manager) contract, uses canonical deployment by default
     */
    spvVaultContract?: string;
    /**
     * Optional UTXO-controlled vault (SPV Vault manager) contract deployment height, which acts as genesis when querying events
     */
    spvVaultDeploymentHeight?: number;
    /**
     * Contract addresses of the refund and claim handlers, uses canonical deployment by default
     */
    handlerContracts?: {
        refund?: {
            timelock?: string;
        };
        claim?: {
            [type in ChainSwapType]?: string;
        };
    };
    /**
     * EVM network fee API
     */
    fees?: F;
    /**
     * EVM configuration
     */
    evmConfig?: Partial<Omit<EVMConfiguration, "safeBlockTag" | "finalizedBlockTag" | "finalityCheckStrategy">>;
};
