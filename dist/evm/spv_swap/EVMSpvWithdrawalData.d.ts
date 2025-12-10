/// <reference types="node" />
/// <reference types="node" />
import { SpvWithdrawalTransactionData } from "@atomiqlabs/base";
import { Buffer } from "buffer";
import { BitcoinVaultTransactionDataStruct } from "./SpvVaultContractTypechain";
export declare class EVMSpvWithdrawalData extends SpvWithdrawalTransactionData {
    private getExecutionHashWith0x;
    protected fromOpReturnData(data: Buffer): {
        recipient: string;
        rawAmounts: bigint[];
        executionHash?: string;
    };
    isRecipient(address: string): boolean;
    getFrontingId(): string;
    getTxHash(): string;
    getFrontingAmount(): bigint[];
    serialize(): any;
    serializeToStruct(): BitcoinVaultTransactionDataStruct;
}
