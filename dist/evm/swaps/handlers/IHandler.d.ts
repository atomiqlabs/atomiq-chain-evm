/// <reference types="node" />
/// <reference types="node" />
import { EVMSwapData } from "../EVMSwapData";
import { EVMTx } from "../../chain/modules/EVMTransactions";
export interface IHandler<TCommitmentData, TWitnessData> {
    readonly address: string;
    getCommitment(data: TCommitmentData): string;
    getWitness(signer: string, data: EVMSwapData, witnessData?: TWitnessData, feeRate?: string): Promise<{
        initialTxns: EVMTx[];
        witness: Buffer;
    }>;
    getGas(data: EVMSwapData): number;
}
