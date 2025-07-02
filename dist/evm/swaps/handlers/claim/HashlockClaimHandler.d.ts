/// <reference types="node" />
/// <reference types="node" />
import { ChainSwapType } from "@atomiqlabs/base";
import { Buffer } from "buffer";
import { IClaimHandler } from "./ClaimHandlers";
import { EVMSwapData } from "../../EVMSwapData";
import { EVMTx } from "../../../chain/modules/EVMTransactions";
export declare class HashlockClaimHandler implements IClaimHandler<Buffer, string> {
    readonly address: string;
    static readonly type: ChainSwapType;
    static readonly gas: number;
    constructor(address: string);
    getCommitment(data: Buffer): string;
    getWitness(signer: string, data: EVMSwapData, witnessData: string): Promise<{
        initialTxns: EVMTx[];
        witness: Buffer;
    }>;
    getGas(): number;
    getType(): ChainSwapType;
}
