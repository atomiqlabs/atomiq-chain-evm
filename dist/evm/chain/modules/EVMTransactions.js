"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMTransactions = void 0;
const EVMModule_1 = require("../EVMModule");
const ethers_1 = require("ethers");
const Utils_1 = require("../../../utils/Utils");
class EVMTransactions extends EVMModule_1.EVMModule {
    constructor() {
        super(...arguments);
        this.latestConfirmedNonces = {};
    }
    /**
     * Waits for transaction confirmation using WS subscription and occasional HTTP polling, also re-sends
     *  the transaction at regular interval
     *
     * @param tx EVM transaction to wait for confirmation for
     * @param abortSignal signal to abort waiting for tx confirmation
     * @private
     */
    async confirmTransaction(tx, abortSignal) {
        let state = "pending";
        while (state === "pending" || state === "not_found") {
            await (0, Utils_1.timeoutPromise)(3000, abortSignal);
            state = await this.getTxIdStatus(tx.hash);
            //Don't re-send transactions
            // if(state==="not_found") await this.sendSignedTransaction(tx).catch(e => {
            //     if(e.baseError?.code === 59) return; //Transaction already in the mempool
            //     console.error("Error on transaction re-send: ", e);
            // });
        }
        const nextAccountNonce = tx.nonce + 1;
        const currentNonce = this.latestConfirmedNonces[tx.from];
        if (currentNonce == null || nextAccountNonce > currentNonce) {
            this.latestConfirmedNonces[tx.from] = nextAccountNonce;
        }
        if (state === "reverted")
            throw new Error("Transaction reverted!");
    }
    /**
     * Prepares starknet transactions, checks if the account is deployed, assigns nonces if needed & calls beforeTxSigned callback
     *
     * @param signer
     * @param txs
     * @private
     */
    async prepareTransactions(signer, txs) {
        let nonce = await signer.getNonce();
        const latestConfirmedNonce = this.latestConfirmedNonces[signer.getAddress()];
        if (latestConfirmedNonce != null && latestConfirmedNonce > nonce) {
            console.debug("StarknetTransactions: prepareTransactions(): Using nonce from local cache!");
            nonce = latestConfirmedNonce;
        }
        for (let i = 0; i < txs.length; i++) {
            const tx = txs[i];
            tx.chainId = this.root.evmChainId;
            tx.from = signer.getAddress();
            if (tx.nonce != null)
                nonce = tx.nonce; //Take the nonce from last tx
            if (nonce == null)
                nonce = await this.root.provider.getTransactionCount(signer.getAddress(), "pending"); //Fetch the nonce
            if (tx.nonce == null)
                tx.nonce = nonce;
            this.logger.debug("sendAndConfirm(): transaction prepared (" + (i + 1) + "/" + txs.length + "), nonce: " + tx.nonce);
            nonce++;
            if (this.cbkBeforeTxSigned != null)
                await this.cbkBeforeTxSigned(tx);
        }
    }
    /**
     * Sends out a signed transaction to the RPC
     *
     * @param tx EVM tx to send
     * @param onBeforePublish a callback called before every transaction is published
     * @private
     */
    async sendSignedTransaction(tx, onBeforePublish) {
        if (onBeforePublish != null)
            await onBeforePublish(tx.hash, await this.serializeTx(tx));
        this.logger.debug("sendSignedTransaction(): sending transaction: ", tx.hash);
        const serializedTx = tx.serialized;
        let result;
        if (this.cbkSendTransaction != null)
            result = await this.cbkSendTransaction(serializedTx);
        if (result == null) {
            const broadcastResult = await this.provider.broadcastTransaction(tx.serialized);
            result = broadcastResult.hash;
        }
        this.logger.info("sendSignedTransaction(): tx sent, txHash: " + result);
        return result;
    }
    /**
     * Prepares, signs, sends (in parallel or sequentially) & optionally waits for confirmation
     *  of a batch of EVM transactions
     *
     * @param signer
     * @param txs transactions to send
     * @param waitForConfirmation whether to wait for transaction confirmations (this also makes sure the transactions
     *  are re-sent at regular intervals)
     * @param abortSignal abort signal to abort waiting for transaction confirmations
     * @param parallel whether the send all the transaction at once in parallel or sequentially (such that transactions
     *  are executed in order)
     * @param onBeforePublish a callback called before every transaction is published
     */
    async sendAndConfirm(signer, txs, waitForConfirmation, abortSignal, parallel, onBeforePublish) {
        await this.prepareTransactions(signer, txs);
        const signedTxs = [];
        //TODO: Maybe don't separate the signing process from the sending when using browser-based wallet,
        // like with Starknet
        for (let i = 0; i < txs.length; i++) {
            const tx = txs[i];
            const signedTx = ethers_1.Transaction.from(await signer.account.signTransaction(tx));
            signedTxs.push(signedTx);
            this.logger.debug("sendAndConfirm(): transaction signed (" + (i + 1) + "/" + txs.length + "): " + signedTx);
        }
        this.logger.debug("sendAndConfirm(): sending transactions, count: " + txs.length +
            " waitForConfirmation: " + waitForConfirmation + " parallel: " + parallel);
        const txIds = [];
        if (parallel) {
            const promises = [];
            for (let i = 0; i < signedTxs.length; i++) {
                const signedTx = signedTxs[i];
                const txId = await this.sendSignedTransaction(signedTx, onBeforePublish);
                if (waitForConfirmation)
                    promises.push(this.confirmTransaction(signedTx, abortSignal));
                txIds.push(txId);
                this.logger.debug("sendAndConfirm(): transaction sent (" + (i + 1) + "/" + signedTxs.length + "): " + signedTx.hash);
            }
            if (promises.length > 0)
                await Promise.all(promises);
        }
        else {
            for (let i = 0; i < signedTxs.length; i++) {
                const signedTx = signedTxs[i];
                const txId = await this.sendSignedTransaction(signedTx, onBeforePublish);
                const confirmPromise = this.confirmTransaction(signedTx, abortSignal);
                this.logger.debug("sendAndConfirm(): transaction sent (" + (i + 1) + "/" + txs.length + "): " + signedTx.hash);
                //Don't await the last promise when !waitForConfirmation
                if (i < txs.length - 1 || waitForConfirmation)
                    await confirmPromise;
                txIds.push(txId);
            }
        }
        this.logger.info("sendAndConfirm(): sent transactions, count: " + txs.length +
            " waitForConfirmation: " + waitForConfirmation + " parallel: " + parallel);
        return txIds;
    }
    /**
     * Serializes the signed EVM transaction
     *
     * @param tx
     */
    serializeTx(tx) {
        return Promise.resolve(tx.serialized);
    }
    /**
     * Deserializes signed EVM transaction
     *
     * @param txData
     */
    deserializeTx(txData) {
        return Promise.resolve(ethers_1.Transaction.from(txData));
    }
    /**
     * Gets the status of the raw starknet transaction
     *
     * @param tx
     */
    async getTxStatus(tx) {
        const parsedTx = await this.deserializeTx(tx);
        return await this.getTxIdStatus(parsedTx.hash);
    }
    /**
     * Gets the status of the starknet transaction with a specific txId
     *
     * @param txId
     */
    async getTxIdStatus(txId) {
        const txResponse = await this.provider.getTransaction(txId);
        if (txResponse == null)
            return "not_found";
        if (txResponse.blockHash == null)
            return "pending";
        const [safeBlockNumber, txReceipt] = await Promise.all([
            this.root.config.safeBlockTag === "latest" ? Promise.resolve(null) : this.provider.getBlock(this.root.config.safeBlockTag).then(res => res.number),
            this.provider.getTransactionReceipt(txId)
        ]);
        if (txReceipt == null || (safeBlockNumber != null && txReceipt.blockNumber < safeBlockNumber))
            return "pending";
        if (txReceipt.status === 0)
            return "reverted";
        return "success";
    }
    onBeforeTxSigned(callback) {
        this.cbkBeforeTxSigned = callback;
    }
    offBeforeTxSigned(callback) {
        this.cbkBeforeTxSigned = null;
        return true;
    }
    onSendTransaction(callback) {
        this.cbkSendTransaction = callback;
    }
    offSendTransaction(callback) {
        this.cbkSendTransaction = null;
        return true;
    }
    traceTransaction(txId) {
        return this.provider.send("debug_traceTransaction", [
            txId,
            {
                tracer: "callTracer"
            }
        ]);
    }
}
exports.EVMTransactions = EVMTransactions;
