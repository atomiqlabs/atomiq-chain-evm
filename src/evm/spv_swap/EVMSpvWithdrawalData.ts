import {SpvWithdrawalTransactionData} from "@atomiqlabs/base";
import {Buffer} from "buffer";
import { EVMSpvVaultContract } from "./EVMSpvVaultContract";
import {BitcoinVaultTransactionDataStruct} from "./SpvVaultContractTypechain";


export class EVMSpvWithdrawalData extends SpvWithdrawalTransactionData {

    protected fromOpReturnData(data: Buffer): { recipient: string; rawAmounts: bigint[]; executionHash: string } {
        return EVMSpvVaultContract.fromOpReturnData(data);
    }

    isRecipient(address: string): boolean {
        return this.getRecipient().toLowerCase()===address.toLowerCase();
    }

    getTxHash(): string {
        return "0x"+Buffer.from(this.btcTx.txid, "hex").reverse().toString("hex");
    }

    getFrontingAmount(): bigint[] {
        return [this.rawAmounts[0] + this.getExecutionFee()[0], this.rawAmounts[1]];
    }

    serialize(): any {
        return {
            type: "EVM",
            ...super.serialize()
        };
    }

    serializeToStruct(): BitcoinVaultTransactionDataStruct {
        const callerFee = this.getCallerFee();
        const frontingFee = this.getFrontingFee();
        const executionFee = this.getExecutionFee();
        return {
            recipient: this.recipient,
            amount0: this.rawAmounts[0],
            amount1: this.rawAmounts[1] ?? 0n,
            callerFee0: callerFee[0],
            callerFee1: callerFee[1] ?? 0n,
            frontingFee0: frontingFee[0],
            frontingFee1: frontingFee[1] ?? 0n,
            executionHandlerFeeAmount0: executionFee[0],
            executionHash: this.executionHash.startsWith("0x") ? this.executionHash : "0x"+this.executionHash,
            executionExpiry: BigInt(this.executionExpiry)
        }
    }

}

SpvWithdrawalTransactionData.deserializers["EVM"] = EVMSpvWithdrawalData;
