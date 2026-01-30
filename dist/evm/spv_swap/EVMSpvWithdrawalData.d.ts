/// <reference types="node" />
/// <reference types="node" />
import { SpvWithdrawalTransactionData } from "@atomiqlabs/base";
import { Buffer } from "buffer";
import { BitcoinVaultTransactionDataStruct } from "./SpvVaultContractTypechain";
/**
 * @category Swaps
 */
export declare class EVMSpvWithdrawalData extends SpvWithdrawalTransactionData {
    private getExecutionHashWith0x;
    /**
     * @inheritDoc
     */
    protected fromOpReturnData(data: Buffer): {
        recipient: string;
        rawAmounts: bigint[];
        executionHash?: string;
    };
    /**
     * @inheritDoc
     */
    isRecipient(address: string): boolean;
    /**
     * @inheritDoc
     */
    getFrontingId(): string;
    getTxHash(): string;
    getFrontingAmount(): bigint[];
    /**
     * @inheritDoc
     */
    serialize(): any;
    serializeToStruct(): BitcoinVaultTransactionDataStruct;
}
