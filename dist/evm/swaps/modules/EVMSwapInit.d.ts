import { EVMSwapModule } from "../EVMSwapModule";
import { EVMSwapData } from "../EVMSwapData";
import { EVMSigner } from "../../wallet/EVMSigner";
import { EVMTx } from "../../chain/modules/EVMTransactions";
export type EVMPreFetchVerification = {
    safeBlockTime?: number;
};
export declare class EVMSwapInit extends EVMSwapModule {
    private static readonly GasCosts;
    /**
     * bare Init action based on the data passed in swapData
     *
     * @param sender
     * @param swapData
     * @param timeout
     * @param signature
     * @param feeRate
     * @private
     */
    private Init;
    /**
     * Returns auth prefix to be used with a specific swap, payIn=true & payIn=false use different prefixes (these
     *  actually have no meaning for the smart contract in the EVM case)
     *
     * @param swapData
     * @private
     */
    private getAuthPrefix;
    preFetchForInitSignatureVerification(): Promise<EVMPreFetchVerification>;
    /**
     * Signs swap initialization authorization, using data from preFetchedBlockData if provided & still valid (subject
     *  to SIGNATURE_PREFETCH_DATA_VALIDITY)
     *
     * @param signer
     * @param swapData
     * @param authorizationTimeout
     * @public
     */
    signSwapInitialization(signer: EVMSigner, swapData: EVMSwapData, authorizationTimeout: number): Promise<{
        prefix: string;
        timeout: string;
        signature: string;
    }>;
    /**
     * Checks whether the provided signature data is valid, using preFetchedData if provided and still valid
     *
     * @param sender
     * @param swapData
     * @param timeout
     * @param prefix
     * @param signature
     * @param preFetchData
     * @public
     */
    isSignatureValid(sender: string, swapData: EVMSwapData, timeout: string, prefix: string, signature: string, preFetchData?: EVMPreFetchVerification): Promise<null>;
    /**
     * Gets expiry of the provided signature data, this is a minimum of slot expiry & swap signature expiry
     *
     * @param timeout
     * @public
     */
    getSignatureExpiry(timeout: string): Promise<number>;
    /**
     * Checks whether signature is expired for good, compares the timestamp to the current "pending" block timestamp
     *
     * @param timeout
     * @param preFetchData
     * @public
     */
    isSignatureExpired(timeout: string, preFetchData?: EVMPreFetchVerification): Promise<boolean>;
    /**
     * Creates init transaction with a valid signature from an LP
     *
     * @param sender
     * @param swapData swap to initialize
     * @param timeout init signature timeout
     * @param prefix init signature prefix
     * @param signature init signature
     * @param skipChecks whether to skip signature validity checks
     * @param feeRate fee rate to use for the transaction
     */
    txsInit(sender: string, swapData: EVMSwapData, timeout: string, prefix: string, signature: string, skipChecks?: boolean, feeRate?: string): Promise<EVMTx[]>;
    private getInitGas;
    /**
     * Get the estimated fee of the init transaction
     */
    getInitFee(swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
}
