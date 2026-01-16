import {Signer, TransactionRequest, TransactionResponse} from "ethers";
import {EVMSigner} from "./EVMSigner";


/**
 * Browser-based EVM signer for external wallet integration
 * @category Wallets
 */
export class EVMBrowserSigner extends EVMSigner {

    constructor(account: Signer, address: string) {
        super(account, address, false);
        this.signTransaction = undefined;
    }

    async sendTransaction(transaction: TransactionRequest, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<TransactionResponse> {
        try {
            return await super.sendTransaction(transaction, onBeforePublish);
        } catch (e: any) {
            if(e.message!=null && (e.message as string).includes("ACTION_REJECTED"))
                throw new Error("User refused to authorize the transaction");
            throw e;
        }
    }

}