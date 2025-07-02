"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSpvWithdrawalData = void 0;
const base_1 = require("@atomiqlabs/base");
const buffer_1 = require("buffer");
const EVMSpvVaultContract_1 = require("./EVMSpvVaultContract");
class EVMSpvWithdrawalData extends base_1.SpvWithdrawalTransactionData {
    fromOpReturnData(data) {
        return EVMSpvVaultContract_1.EVMSpvVaultContract.fromOpReturnData(data);
    }
    isRecipient(address) {
        return this.getRecipient().toLowerCase() === address.toLowerCase();
    }
    getTxHash() {
        return "0x" + buffer_1.Buffer.from(this.btcTx.txid, "hex").reverse().toString("hex");
    }
    getFrontingAmount() {
        return [this.rawAmounts[0] + this.getExecutionFee()[0], this.rawAmounts[1]];
    }
    serialize() {
        return {
            type: "EVM",
            ...super.serialize()
        };
    }
    serializeToStruct() {
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
            executionHash: this.executionHash.startsWith("0x") ? this.executionHash : "0x" + this.executionHash,
            executionExpiry: BigInt(this.executionExpiry)
        };
    }
}
exports.EVMSpvWithdrawalData = EVMSpvWithdrawalData;
base_1.SpvWithdrawalTransactionData.deserializers["EVM"] = EVMSpvWithdrawalData;
