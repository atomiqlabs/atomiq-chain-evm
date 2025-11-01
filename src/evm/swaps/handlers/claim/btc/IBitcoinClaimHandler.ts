import {IClaimHandler} from "../ClaimHandlers";
import {BigIntBufferUtils, ChainSwapType, RelaySynchronizer} from "@atomiqlabs/base";
import {EVMBtcRelay} from "../../../../btcrelay/EVMBtcRelay";
import { EVMBtcStoredHeader } from "../../../../btcrelay/headers/EVMBtcStoredHeader";
import {EVMTx} from "../../../../chain/modules/EVMTransactions";
import {getLogger} from "../../../../../utils/Utils";
import {keccak256} from "ethers";
import {Buffer} from "buffer";
import {EVMSwapData} from "../../../EVMSwapData";

export type BitcoinCommitmentData = {
    btcRelay: EVMBtcRelay<any>,
    confirmations: number
}

export type BitcoinWitnessData = {
    tx: { blockhash: string, confirmations: number, txid: string, hex: string, height: number },
    requiredConfirmations: number,
    btcRelay: EVMBtcRelay<any>,
    commitedHeader?: EVMBtcStoredHeader,
    synchronizer?: RelaySynchronizer<EVMBtcStoredHeader, EVMTx, any>
};

const logger = getLogger("IBitcoinClaimHandler: ");

export abstract class IBitcoinClaimHandler<C, W extends BitcoinWitnessData> implements IClaimHandler<C & BitcoinCommitmentData, W> {

    public readonly address: string;

    constructor(address: string) {
        this.address = address;
    }

    public static readonly address = "";
    public static readonly type: ChainSwapType = ChainSwapType.CHAIN_TXID;
    public static readonly gas: number = 10_000;

    protected serializeCommitment(data: BitcoinCommitmentData): Buffer {
        const buffer = Buffer.alloc(24);
        buffer.writeUint32BE(data.confirmations, 0);
        Buffer.from(data.btcRelay.contractAddress.substring(2), "hex").copy(buffer, 4, 0, 20);
        return buffer;
    }

    getCommitment(data: C & BitcoinCommitmentData): string {
        return keccak256(this.serializeCommitment(data));
    }

    protected async _getWitness(
        signer: string,
        swapData: EVMSwapData,
        {tx, btcRelay, commitedHeader, synchronizer, requiredConfirmations}: BitcoinWitnessData,
        commitment: C,
        feeRate?: string
    ): Promise<{
        initialTxns: EVMTx[];
        witness: Buffer,
        commitment: Buffer,
        blockheader: Buffer,
        merkleProof: Buffer
    }> {
        const serializedCommitment: Buffer = this.serializeCommitment({
            ...commitment,
            btcRelay,
            confirmations: requiredConfirmations
        });
        const commitmentHash = keccak256(serializedCommitment);

        if(!swapData.isClaimData(commitmentHash)) throw new Error("Invalid commit data");

        const merkleProof = await btcRelay.bitcoinRpc.getMerkleProof(tx.txid, tx.blockhash);
        if(merkleProof==null) throw new Error(`Failed to generate merkle proof for tx: ${tx.txid}!`);
        logger.debug("getWitness(): merkle proof computed: ", merkleProof);

        const txs: EVMTx[] = [];
        if(commitedHeader==null) {
            const headers = await EVMBtcRelay.getCommitedHeadersAndSynchronize(
                signer, btcRelay,
                [{blockheight: tx.height, requiredConfirmations, blockhash: tx.blockhash}],
                txs, synchronizer, feeRate
            );
            if(headers==null) throw new Error("Cannot fetch committed header!");
            commitedHeader = headers[tx.blockhash];
        }

        const serializedHeader = commitedHeader.serialize();

        const serializedMerkleProof = Buffer.concat([
            BigIntBufferUtils.toBuffer(BigInt(merkleProof.pos), "be", 4),
            BigIntBufferUtils.toBuffer(BigInt(merkleProof.merkle.length), "be", 32),
            ...merkleProof.merkle
        ]);

        return {
            initialTxns: txs,
            witness: Buffer.concat([
                serializedCommitment,
                serializedHeader,
                serializedMerkleProof
            ]),
            commitment: serializedCommitment,
            blockheader: serializedHeader,
            merkleProof: serializedMerkleProof
        };
    }

    abstract getWitness(signer: string, data: EVMSwapData, witnessData: W, feeRate?: string): Promise<{
        initialTxns: EVMTx[];
        witness: Buffer
    }>;

    abstract getGas(data: EVMSwapData): number;

    abstract getType(): ChainSwapType;

}
