/// <reference types="node" />
/// <reference types="node" />
import { IClaimHandler } from "../ClaimHandlers";
import { ChainSwapType, RelaySynchronizer } from "@atomiqlabs/base";
import { EVMBtcRelay } from "../../../../btcrelay/EVMBtcRelay";
import { EVMBtcStoredHeader } from "../../../../btcrelay/headers/EVMBtcStoredHeader";
import { EVMTx } from "../../../../chain/modules/EVMTransactions";
import { Buffer } from "buffer";
import { EVMSwapData } from "../../../EVMSwapData";
export type BitcoinCommitmentData = {
    btcRelay: EVMBtcRelay<any>;
    confirmations: number;
};
export type BitcoinWitnessData = {
    tx: {
        blockhash: string;
        confirmations: number;
        txid: string;
        hex: string;
        height: number;
    };
    requiredConfirmations: number;
    btcRelay: EVMBtcRelay<any>;
    commitedHeader?: EVMBtcStoredHeader;
    synchronizer?: RelaySynchronizer<EVMBtcStoredHeader, EVMTx, any>;
};
export declare abstract class IBitcoinClaimHandler<C, W extends BitcoinWitnessData> implements IClaimHandler<C & BitcoinCommitmentData, W> {
    readonly address: string;
    constructor(address: string);
    static readonly address = "";
    static readonly type: ChainSwapType;
    static readonly gas: number;
    protected serializeCommitment(data: BitcoinCommitmentData): Buffer;
    getCommitment(data: C & BitcoinCommitmentData): string;
    protected _getWitness(signer: string, swapData: EVMSwapData, { tx, btcRelay, commitedHeader, synchronizer, requiredConfirmations }: BitcoinWitnessData, commitment: C, feeRate?: string): Promise<{
        initialTxns: EVMTx[];
        witness: Buffer;
        commitment: Buffer;
        blockheader: Buffer;
        merkleProof: Buffer;
    }>;
    abstract getWitness(signer: string, data: EVMSwapData, witnessData: W, feeRate?: string): Promise<{
        initialTxns: EVMTx[];
        witness: Buffer;
    }>;
    abstract getGas(data: EVMSwapData): number;
    abstract getType(): ChainSwapType;
}
