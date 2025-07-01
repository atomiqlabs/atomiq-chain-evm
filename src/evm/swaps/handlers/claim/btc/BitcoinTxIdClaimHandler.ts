import {ChainSwapType} from "@atomiqlabs/base";
import {getLogger} from "../../../../../utils/Utils";
import {BitcoinCommitmentData, BitcoinWitnessData, IBitcoinClaimHandler} from "./IBitcoinClaimHandler";
import {Buffer} from "buffer";
import {EVMSwapData} from "../../../EVMSwapData";
import {EVMTx} from "../../../../chain/modules/EVMTransactions";

export type BitcoinTxIdCommitmentData = {
    txId: string
};

export class BitcoinTxIdClaimHandler extends IBitcoinClaimHandler<BitcoinTxIdCommitmentData, BitcoinWitnessData> {

    public static readonly type: ChainSwapType = ChainSwapType.CHAIN_TXID;
    public static readonly gas: number = 10_000;

    protected serializeCommitment(data: BitcoinTxIdCommitmentData & BitcoinCommitmentData): Buffer {
        return Buffer.concat([
            Buffer.from(data.txId, "hex").reverse(),
            super.serializeCommitment(data)
        ]);
    }

    getWitness(
        signer: string,
        swapData: EVMSwapData,
        witnessData: BitcoinWitnessData,
        feeRate?: string
    ): Promise<{
        initialTxns: EVMTx[];
        witness: Buffer
    }> {
        if(!swapData.isClaimHandler(this.address)) throw new Error("Invalid claim handler");

        return this._getWitness(signer, swapData, witnessData, {txId: witnessData.tx.txid});
    }

    getGas(data: EVMSwapData): number {
        return BitcoinTxIdClaimHandler.gas;
    }

    getType(): ChainSwapType {
        return BitcoinTxIdClaimHandler.type;
    }

}
