import { EVMSwapModule } from "../EVMSwapModule";
import { EVMSwapData } from "../EVMSwapData";
import { EVMSigner } from "../../wallet/EVMSigner";
import { EVMTx } from "../../chain/modules/EVMTransactions";
export declare class EVMSwapRefund extends EVMSwapModule {
    private static readonly GasCosts;
    /**
     * Action for generic Refund instruction
     *
     * @param signer
     * @param swapData
     * @param witness
     * @param feeRate
     * @param handlerGas
     * @private
     */
    private Refund;
    /**
     * Action for cooperative refunding with signature
     *
     * @param sender
     * @param swapData
     * @param timeout
     * @param signature
     * @param feeRate
     * @private
     */
    private RefundWithSignature;
    signSwapRefund(signer: EVMSigner, swapData: EVMSwapData, authorizationTimeout: number): Promise<{
        prefix: string;
        timeout: string;
        signature: string;
    }>;
    isSignatureValid(swapData: EVMSwapData, timeout: string, prefix: string, signature: string): Promise<null>;
    /**
     * Creates transactions required for refunding timed out swap
     *
     * @param signer
     * @param swapData swap data to refund
     * @param check whether to check if swap is already expired and refundable
     * @param feeRate fee rate to be used for the transactions
     * @param witnessData
     */
    txsRefund<T>(signer: string, swapData: EVMSwapData, check?: boolean, feeRate?: string, witnessData?: T): Promise<EVMTx[]>;
    /**
     * Creates transactions required for refunding the swap with authorization signature, also unwraps WSOL to SOL
     *
     * @param signer
     * @param swapData swap data to refund
     * @param timeout signature timeout
     * @param prefix signature prefix of the counterparty
     * @param signature signature of the counterparty
     * @param check whether to check if swap is committed before attempting refund
     * @param feeRate fee rate to be used for the transactions
     */
    txsRefundWithAuthorization(signer: string, swapData: EVMSwapData, timeout: string, prefix: string, signature: string, check?: boolean, feeRate?: string): Promise<EVMTx[]>;
    getRefundGas(swapData: EVMSwapData): number;
    /**
     * Get the estimated transaction fee of the refund transaction
     */
    getRefundFee(swapData: EVMSwapData, feeRate?: string): Promise<bigint>;
}
