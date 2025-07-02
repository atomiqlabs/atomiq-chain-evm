"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IBitcoinClaimHandler = void 0;
const base_1 = require("@atomiqlabs/base");
const EVMBtcRelay_1 = require("../../../../btcrelay/EVMBtcRelay");
const Utils_1 = require("../../../../../utils/Utils");
const ethers_1 = require("ethers");
const buffer_1 = require("buffer");
const logger = (0, Utils_1.getLogger)("IBitcoinClaimHandler: ");
class IBitcoinClaimHandler {
    constructor(address) {
        this.address = address;
    }
    serializeCommitment(data) {
        const buffer = buffer_1.Buffer.alloc(24);
        buffer.writeUint32BE(data.confirmations, 0);
        buffer_1.Buffer.from(data.btcRelay.contractAddress.substring(2), "hex").copy(buffer, 4, 0, 20);
        return buffer;
    }
    getCommitment(data) {
        return (0, ethers_1.keccak256)(this.serializeCommitment(data));
    }
    async _getWitness(signer, swapData, { tx, btcRelay, commitedHeader, synchronizer, requiredConfirmations }, commitment, feeRate) {
        const serializedCommitment = this.serializeCommitment({
            ...commitment,
            btcRelay,
            confirmations: requiredConfirmations
        });
        const commitmentHash = (0, ethers_1.keccak256)(serializedCommitment);
        if (!swapData.isClaimData(commitmentHash))
            throw new Error("Invalid commit data");
        const merkleProof = await btcRelay.bitcoinRpc.getMerkleProof(tx.txid, tx.blockhash);
        logger.debug("getWitness(): merkle proof computed: ", merkleProof);
        const txs = [];
        if (commitedHeader == null) {
            const headers = await EVMBtcRelay_1.EVMBtcRelay.getCommitedHeadersAndSynchronize(signer, btcRelay, [{ blockheight: tx.height, requiredConfirmations, blockhash: tx.blockhash }], txs, synchronizer, feeRate);
            if (headers == null)
                throw new Error("Cannot fetch committed header!");
            commitedHeader = headers[tx.blockhash];
        }
        const serializedHeader = commitedHeader.serialize();
        const serializedMerkleProof = buffer_1.Buffer.concat([
            base_1.BigIntBufferUtils.toBuffer(BigInt(merkleProof.pos), "be", 4),
            base_1.BigIntBufferUtils.toBuffer(BigInt(merkleProof.merkle.length), "be", 32),
            ...merkleProof.merkle
        ]);
        return {
            initialTxns: txs,
            witness: buffer_1.Buffer.concat([
                serializedCommitment,
                serializedHeader,
                serializedMerkleProof
            ]),
            commitment: serializedCommitment,
            blockheader: serializedHeader,
            merkleProof: serializedMerkleProof
        };
    }
}
exports.IBitcoinClaimHandler = IBitcoinClaimHandler;
IBitcoinClaimHandler.address = "";
IBitcoinClaimHandler.type = base_1.ChainSwapType.CHAIN_TXID;
IBitcoinClaimHandler.gas = 10000;
