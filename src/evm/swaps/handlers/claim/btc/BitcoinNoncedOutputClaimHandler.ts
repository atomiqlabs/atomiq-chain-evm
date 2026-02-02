import {BigIntBufferUtils, ChainSwapType} from "@atomiqlabs/base";
import {BitcoinCommitmentData, IBitcoinClaimHandler} from "./IBitcoinClaimHandler";
import {BitcoinOutputWitnessData} from "./BitcoinOutputClaimHandler";
import {Transaction} from "@scure/btc-signer";
import {Buffer} from "buffer";
import {keccak256, solidityPackedKeccak256} from "ethers";
import {EVMSwapData} from "../../../EVMSwapData";
import {EVMTx} from "../../../../chain/modules/EVMTransactions";

export type BitcoinNoncedOutputCommitmentData = {
    output: Buffer,
    amount: bigint,
    nonce: bigint
};

function getTransactionNonce(btcTx: Transaction): bigint {
    const locktimeSub500M = BigInt(btcTx.lockTime - 500000000);
    if(locktimeSub500M < 0n) throw new Error("Locktime too low!");
    const nSequence = BigInt(btcTx.getInput(0).sequence!);
    return (locktimeSub500M << 24n) | (nSequence & 0x00FFFFFFn);
}

/**
 * @category Internal/Handlers
 */
export class BitcoinNoncedOutputClaimHandler extends IBitcoinClaimHandler<BitcoinNoncedOutputCommitmentData, BitcoinOutputWitnessData> {

    public static readonly type: ChainSwapType = ChainSwapType.CHAIN_NONCED;
    public static readonly gas: number = 40_000;

    protected serializeCommitment(data: BitcoinNoncedOutputCommitmentData & BitcoinCommitmentData): Buffer {
        const txoHash = solidityPackedKeccak256(["uint64", "uint64", "bytes32"], [data.nonce, data.amount, keccak256(data.output)]);
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
            amount: out.amount!,
            nonce: getTransactionNonce(parsedBtcTx)
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
        return BitcoinNoncedOutputClaimHandler.gas;
    }

    getType(): ChainSwapType {
        return BitcoinNoncedOutputClaimHandler.type;
    }

}
