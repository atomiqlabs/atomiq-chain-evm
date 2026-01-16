import { Signer, TransactionRequest, TransactionResponse } from "ethers";
import { EVMSigner } from "./EVMSigner";
/**
 * Browser-based EVM signer for external wallet integration
 * @category Wallets
 */
export declare class EVMBrowserSigner extends EVMSigner {
    constructor(account: Signer, address: string);
    sendTransaction(transaction: TransactionRequest, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<TransactionResponse>;
}
