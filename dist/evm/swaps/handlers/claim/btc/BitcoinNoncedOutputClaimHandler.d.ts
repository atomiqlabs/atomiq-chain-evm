/// <reference types="node" />
/// <reference types="node" />
import { ChainSwapType } from "@atomiqlabs/base";
import { BitcoinCommitmentData, IBitcoinClaimHandler } from "./IBitcoinClaimHandler";
import { BitcoinOutputWitnessData } from "./BitcoinOutputClaimHandler";
import { Buffer } from "buffer";
import { EVMSwapData } from "../../../EVMSwapData";
import { EVMTx } from "../../../../chain/modules/EVMTransactions";
export type BitcoinNoncedOutputCommitmentData = {
    output: Buffer;
    amount: bigint;
    nonce: bigint;
};
export declare class BitcoinNoncedOutputClaimHandler extends IBitcoinClaimHandler<BitcoinNoncedOutputCommitmentData, BitcoinOutputWitnessData> {
    static readonly type: ChainSwapType;
    static readonly gas: number;
    protected serializeCommitment(data: BitcoinNoncedOutputCommitmentData & BitcoinCommitmentData): Buffer;
    getWitness(signer: string, swapData: EVMSwapData, witnessData: BitcoinOutputWitnessData, feeRate?: string): Promise<{
        initialTxns: EVMTx[];
        witness: Buffer;
    }>;
    getGas(data: EVMSwapData): number;
    getType(): ChainSwapType;
}
