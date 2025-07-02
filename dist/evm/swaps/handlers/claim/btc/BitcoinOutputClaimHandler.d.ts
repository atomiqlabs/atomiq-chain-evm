/// <reference types="node" />
/// <reference types="node" />
import { ChainSwapType } from "@atomiqlabs/base";
import { BitcoinCommitmentData, BitcoinWitnessData, IBitcoinClaimHandler } from "./IBitcoinClaimHandler";
import { Buffer } from "buffer";
import { EVMTx } from "../../../../chain/modules/EVMTransactions";
import { EVMSwapData } from "../../../EVMSwapData";
export type BitcoinOutputCommitmentData = {
    output: Buffer;
    amount: bigint;
};
export type BitcoinOutputWitnessData = BitcoinWitnessData & {
    vout: number;
};
export declare class BitcoinOutputClaimHandler extends IBitcoinClaimHandler<BitcoinOutputCommitmentData, BitcoinOutputWitnessData> {
    static readonly type: ChainSwapType;
    static readonly gas: number;
    protected serializeCommitment(data: BitcoinOutputCommitmentData & BitcoinCommitmentData): Buffer;
    getWitness(signer: string, swapData: EVMSwapData, witnessData: BitcoinOutputWitnessData, feeRate?: string): Promise<{
        initialTxns: EVMTx[];
        witness: Buffer;
    }>;
    getGas(data: EVMSwapData): number;
    getType(): ChainSwapType;
}
