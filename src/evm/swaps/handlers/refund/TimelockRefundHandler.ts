import {IHandler} from "../IHandler";
import {BigIntBufferUtils} from "@atomiqlabs/base";
import {EVMSwapData} from "../../EVMSwapData";
import {EVMTx} from "../../../chain/modules/EVMTransactions";

export class TimelockRefundHandler implements IHandler<bigint, never> {

    public readonly address: string;
    public static readonly gas: number = 5_000;

    constructor(address: string) {
        this.address = address;
    }

    public getCommitment(data: bigint): string {
        return "0x"+BigIntBufferUtils.toBuffer(data, "be", 32).toString("hex");
    }

    public getWitness(signer: string, data: EVMSwapData): Promise<{
        initialTxns: EVMTx[],
        witness: Buffer
    }> {
        const expiry = TimelockRefundHandler.getExpiry(data);
        const currentTimestamp = BigInt(Math.floor(Date.now()/1000));
        if(expiry > currentTimestamp) throw new Error("Not expired yet!");
        return Promise.resolve({initialTxns: [], witness: Buffer.alloc(0)});
    }

    getGas(): number {
        return TimelockRefundHandler.gas;
    }

    public static getExpiry(data: EVMSwapData): bigint {
        const expiryDataBuffer = Buffer.from(data.refundData.startsWith("0x") ? data.refundData.substring(2) : data.refundData, "hex");
        return BigIntBufferUtils.fromBuffer(expiryDataBuffer, "be");
    }

}