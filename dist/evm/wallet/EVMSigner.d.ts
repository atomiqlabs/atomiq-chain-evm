import { AbstractSigner } from "@atomiqlabs/base";
import { Signer, TransactionRequest, TransactionResponse } from "ethers";
export declare class EVMSigner implements AbstractSigner {
    type: "AtomiqAbstractSigner";
    account: Signer;
    readonly address: string;
    readonly isManagingNoncesInternally: boolean;
    constructor(account: Signer, address: string, isManagingNoncesInternally?: boolean);
    getAddress(): string;
    signTransaction?(transaction: TransactionRequest): Promise<string>;
    sendTransaction(transaction: TransactionRequest, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<TransactionResponse>;
}
