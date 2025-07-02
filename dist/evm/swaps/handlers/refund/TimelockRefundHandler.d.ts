/// <reference types="node" />
/// <reference types="node" />
import { IHandler } from "../IHandler";
import { EVMSwapData } from "../../EVMSwapData";
import { EVMTx } from "../../../chain/modules/EVMTransactions";
export declare class TimelockRefundHandler implements IHandler<bigint, never> {
    readonly address: string;
    static readonly gas: number;
    constructor(address: string);
    getCommitment(data: bigint): string;
    getWitness(signer: string, data: EVMSwapData): Promise<{
        initialTxns: EVMTx[];
        witness: Buffer;
    }>;
    getGas(): number;
    static getExpiry(data: EVMSwapData): bigint;
}
