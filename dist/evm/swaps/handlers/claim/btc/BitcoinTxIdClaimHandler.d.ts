/// <reference types="node" />
/// <reference types="node" />
import { ChainSwapType } from "@atomiqlabs/base";
import { BitcoinCommitmentData, BitcoinWitnessData, IBitcoinClaimHandler } from "./IBitcoinClaimHandler";
import { Buffer } from "buffer";
import { EVMSwapData } from "../../../EVMSwapData";
import { EVMTx } from "../../../../chain/modules/EVMTransactions";
export type BitcoinTxIdCommitmentData = {
    txId: string;
};
/**
 * @category Handlers
 */
export declare class BitcoinTxIdClaimHandler extends IBitcoinClaimHandler<BitcoinTxIdCommitmentData, BitcoinWitnessData> {
    static readonly type: ChainSwapType;
    static readonly gas: number;
    protected serializeCommitment(data: BitcoinTxIdCommitmentData & BitcoinCommitmentData): Buffer;
    getWitness(signer: string, swapData: EVMSwapData, witnessData: BitcoinWitnessData, feeRate?: string): Promise<{
        initialTxns: EVMTx[];
        witness: Buffer;
    }>;
    getGas(data: EVMSwapData): number;
    getType(): ChainSwapType;
}
