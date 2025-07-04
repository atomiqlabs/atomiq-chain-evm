"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelockRefundHandler = void 0;
const base_1 = require("@atomiqlabs/base");
class TimelockRefundHandler {
    constructor(address) {
        this.address = address;
    }
    getCommitment(data) {
        return "0x" + base_1.BigIntBufferUtils.toBuffer(data, "be", 32).toString("hex");
    }
    getWitness(signer, data) {
        const expiry = TimelockRefundHandler.getExpiry(data);
        const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
        if (expiry > currentTimestamp)
            throw new Error("Not expired yet!");
        return Promise.resolve({ initialTxns: [], witness: Buffer.alloc(0) });
    }
    getGas() {
        return TimelockRefundHandler.gas;
    }
    static getExpiry(data) {
        const expiryDataBuffer = Buffer.from(data.refundData.startsWith("0x") ? data.refundData.substring(2) : data.refundData, "hex");
        return base_1.BigIntBufferUtils.fromBuffer(expiryDataBuffer, "be");
    }
}
exports.TimelockRefundHandler = TimelockRefundHandler;
TimelockRefundHandler.gas = 5000;
