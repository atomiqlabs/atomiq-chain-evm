import {BigIntBufferUtils, ChainSwapType} from "@atomiqlabs/base";
import {BitcoinCommitmentData, BitcoinWitnessData, IBitcoinClaimHandler} from "./IBitcoinClaimHandler";
import {Buffer} from "buffer";
import {keccak256, solidityPackedKeccak256} from "ethers";
import {EVMTx} from "../../../../chain/modules/EVMTransactions";
import {Transaction} from "@scure/btc-signer";
import {EVMSwapData} from "../../../EVMSwapData";

export type BitcoinOutputCommitmentData = {
    output: Buffer,
    amount: bigint
};

export type BitcoinOutputWitnessData = BitcoinWitnessData & {
    vout: number
};

/**
 * @category Handlers
 */
export class BitcoinOutputClaimHandler extends IBitcoinClaimHandler<BitcoinOutputCommitmentData, BitcoinOutputWitnessData> {

    public static readonly type: ChainSwapType = ChainSwapType.CHAIN;
    public static readonly gas: number = 40_000;

    protected serializeCommitment(data: BitcoinOutputCommitmentData & BitcoinCommitmentData): Buffer {
        const txoHash = solidityPackedKeccak256(["uint64", "bytes32"], [data.amount, keccak256(data.output)]);
        return Buffer.concat([
            Buffer.from(txoHash.substring(2), "hex"),
            super.serializeCommitment(data)
        ]);
    }

    async getWitness(
        signer: string,
        swapData: EVMSwapData,
        witnessData: BitcoinOutputWitnessData,
        feeRate?: string
    ): Promise<{
        initialTxns: EVMTx[];
        witness: Buffer
    }> {
        if(!swapData.isClaimHandler(this.address)) throw new Error("Invalid claim handler");

        const txBuffer = Buffer.from(witnessData.tx.hex, "hex");
        const parsedBtcTx = Transaction.fromRaw(txBuffer);
        const out = parsedBtcTx.getOutput(witnessData.vout);

        const {initialTxns, commitment, blockheader, merkleProof} = await this._getWitness(signer, swapData, witnessData, {
            output: Buffer.from(out.script!),
            amount: out.amount!
        });

        const voutAndTxData = Buffer.concat([
            BigIntBufferUtils.toBuffer(BigInt(witnessData.vout), "be", 4),
            BigIntBufferUtils.toBuffer(BigInt(txBuffer.length), "be", 32),
            txBuffer
        ]);

        return {
            initialTxns,
            witness: Buffer.concat([
                commitment,
                blockheader,
                voutAndTxData,
                merkleProof
            ])
        };
    }

    getGas(data: EVMSwapData): number {
        return BitcoinOutputClaimHandler.gas;
    }

    getType(): ChainSwapType {
        return BitcoinOutputClaimHandler.type;
    }

}
