import {ChainSwapType} from "@atomiqlabs/base";
import {Buffer} from "buffer";
import {IClaimHandler} from "./ClaimHandlers";
import {hexlify} from "ethers";
import {EVMSwapData} from "../../EVMSwapData";
import {EVMTx} from "../../../chain/modules/EVMTransactions";
import {sha256} from "@noble/hashes/sha2";

/**
 * @category Handlers
 */
export class HashlockClaimHandler implements IClaimHandler<Buffer, string> {

    public readonly address: string;
    public static readonly type: ChainSwapType = ChainSwapType.HTLC;
    public static readonly gas: number = 5_000;

    constructor(address: string) {
        this.address = address;
    }

    getCommitment(data: Buffer): string {
        if(data.length!==32) throw new Error("Invalid swap hash");
        return hexlify(data);
    }

    public getWitness(signer: string, data: EVMSwapData, witnessData: string): Promise<{
        initialTxns: EVMTx[],
        witness: Buffer
    }> {
        if(!data.isClaimHandler(this.address)) throw new Error("Invalid claim handler");
        if(witnessData.length!==64) throw new Error("Invalid hash secret: string length");
        const buffer = Buffer.from(witnessData, "hex");
        if(buffer.length!==32) throw new Error("Invalid hash secret: buff length");

        const witnessSha256 = Buffer.from(sha256(buffer));
        if(!data.isClaimData(this.getCommitment(witnessSha256))) throw new Error("Invalid hash secret: poseidon hash doesn't match");

        return Promise.resolve({initialTxns: [], witness: buffer});
    }

    getGas(): number {
        return HashlockClaimHandler.gas;
    }

    getType(): ChainSwapType {
        return HashlockClaimHandler.type;
    }

}