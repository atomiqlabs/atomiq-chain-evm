"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMPersistentSigner = void 0;
const fs = require("fs/promises");
const ethers_1 = require("ethers");
const Utils_1 = require("../../utils/Utils");
const EVMFees_1 = require("../chain/modules/EVMFees");
const EVMSigner_1 = require("./EVMSigner");
const promise_queue_ts_1 = require("promise-queue-ts");
const WAIT_BEFORE_BUMP = 15 * 1000;
const MIN_FEE_INCREASE_ABSOLUTE = 1n * 1000000000n; //1GWei
const MIN_FEE_INCREASE_PPM = 100000n; // +10%
class EVMPersistentSigner extends EVMSigner_1.EVMSigner {
    constructor(account, address, chainInterface, directory, minFeeIncreaseAbsolute, minFeeIncreasePpm, waitBeforeBumpMillis) {
        super(account, address, true);
        this.pendingTxs = new Map();
        this.stopped = false;
        this.saveCount = 0;
        this.sendTransactionQueue = new promise_queue_ts_1.PromiseQueue();
        this.signTransaction = null;
        this.chainInterface = chainInterface;
        this.directory = directory;
        this.minFeeIncreaseAbsolute = minFeeIncreaseAbsolute ?? MIN_FEE_INCREASE_ABSOLUTE;
        this.minFeeIncreasePpm = minFeeIncreasePpm ?? MIN_FEE_INCREASE_PPM;
        this.waitBeforeBump = waitBeforeBumpMillis ?? WAIT_BEFORE_BUMP;
        this.safeBlockTag = chainInterface.config.safeBlockTag;
        this.logger = (0, Utils_1.getLogger)("EVMPersistentSigner(" + address + "): ");
    }
    async load() {
        const fileExists = await fs.access(this.directory + "/txs.json", fs.constants.F_OK).then(() => true).catch(() => false);
        if (!fileExists)
            return;
        const res = await fs.readFile(this.directory + "/txs.json");
        if (res != null) {
            const pendingTxs = JSON.parse(res.toString());
            for (let nonceStr in pendingTxs) {
                const nonceData = pendingTxs[nonceStr];
                const nonce = parseInt(nonceStr);
                if (this.confirmedNonce >= nonce)
                    continue; //Already confirmed
                if (this.pendingNonce < nonce) {
                    this.pendingNonce = nonce;
                }
                const parsedPendingTxns = nonceData.txs.map(ethers_1.Transaction.from);
                this.pendingTxs.set(nonce, {
                    txs: parsedPendingTxns,
                    lastBumped: nonceData.lastBumped
                });
                for (let tx of parsedPendingTxns) {
                    this.chainInterface.Transactions._knownTxSet.add(tx.hash);
                }
            }
        }
    }
    async save() {
        const pendingTxs = {};
        for (let [nonce, data] of this.pendingTxs) {
            pendingTxs[nonce.toString(10)] = {
                lastBumped: data.lastBumped,
                txs: data.txs.map(tx => tx.serialized)
            };
        }
        const requiredSaveCount = ++this.saveCount;
        if (this.priorSavePromise != null) {
            await this.priorSavePromise;
        }
        if (requiredSaveCount === this.saveCount) {
            this.priorSavePromise = fs.writeFile(this.directory + "/txs.json", JSON.stringify(pendingTxs));
            await this.priorSavePromise;
        }
    }
    async checkPastTransactions() {
        let _gasPrice = null;
        let _safeBlockTxCount = null;
        for (let [nonce, data] of this.pendingTxs) {
            if (!data.sending && data.lastBumped < Date.now() - this.waitBeforeBump) {
                if (_safeBlockTxCount == null) {
                    _safeBlockTxCount = await this.chainInterface.provider.getTransactionCount(this.address, this.safeBlockTag);
                    this.confirmedNonce = _safeBlockTxCount - 1;
                }
                if (this.confirmedNonce >= nonce) {
                    this.pendingTxs.delete(nonce);
                    data.txs.forEach(tx => this.chainInterface.Transactions._knownTxSet.delete(tx.hash));
                    this.logger.info(`checkPastTransactions(): Tx confirmed, nonce: ${nonce}, required fee bumps: `, data.txs.length);
                    this.save();
                    continue;
                }
                const lastTx = data.txs[data.txs.length - 1];
                if (_gasPrice == null) {
                    const feeRate = await this.chainInterface.Fees.getFeeRate();
                    const [baseFee, priorityFee] = feeRate.split(",");
                    _gasPrice = {
                        baseFee: BigInt(baseFee),
                        priorityFee: BigInt(priorityFee)
                    };
                }
                let priorityFee = lastTx.maxPriorityFeePerGas;
                let baseFee = lastTx.maxFeePerGas - lastTx.maxPriorityFeePerGas;
                baseFee = (0, Utils_1.bigIntMax)(_gasPrice.baseFee, this.minFeeIncreaseAbsolute + (baseFee * (1000000n + this.minFeeIncreasePpm) / 1000000n));
                priorityFee = (0, Utils_1.bigIntMax)(_gasPrice.priorityFee, this.minFeeIncreaseAbsolute + (priorityFee * (1000000n + this.minFeeIncreasePpm) / 1000000n));
                if (baseFee > (this.minFeeIncreaseAbsolute + (_gasPrice.baseFee * (1000000n + this.minFeeIncreasePpm) / 1000000n)) &&
                    priorityFee > (this.minFeeIncreaseAbsolute + (_gasPrice.priorityFee * (1000000n + this.minFeeIncreasePpm) / 1000000n))) {
                    //Too big of an increase over the current fee rate, don't fee bump
                    this.logger.debug("checkPastTransactions(): Tx yet unconfirmed but not increasing fee for ", lastTx.hash);
                    await this.chainInterface.provider.broadcastTransaction(lastTx.serialized).catch(e => {
                        if (e.code === "NONCE_EXPIRED") {
                            this.logger.debug("checkPastTransactions(): Tx re-broadcast success, tx already confirmed: ", lastTx.hash);
                            return;
                        }
                        if (e.error?.message === "already known") {
                            this.logger.debug("checkPastTransactions(): Tx re-broadcast success, tx already known to the RPC: ", lastTx.hash);
                            return;
                        }
                        this.logger.error("checkPastTransactions(): Tx re-broadcast error", e);
                    });
                    data.lastBumped = Date.now();
                    continue;
                }
                let newTx = lastTx.clone();
                EVMFees_1.EVMFees.applyFeeRate(newTx, null, baseFee.toString(10) + "," + priorityFee.toString(10));
                this.logger.info("checkPastTransactions(): Bump fee for tx: ", lastTx.hash);
                newTx.signature = null;
                const signedRawTx = await this.account.signTransaction(newTx);
                //Double check pending txns still has nonce after async signTransaction was called
                if (!this.pendingTxs.has(nonce))
                    continue;
                newTx = ethers_1.Transaction.from(signedRawTx);
                for (let callback of this.chainInterface.Transactions._cbksBeforeTxReplace) {
                    try {
                        await callback(lastTx.serialized, lastTx.hash, signedRawTx, newTx.hash);
                    }
                    catch (e) {
                        this.logger.error("checkPastTransactions(): beforeTxReplace callback error: ", e);
                    }
                }
                data.txs.push(newTx);
                data.lastBumped = Date.now();
                this.save();
                this.chainInterface.Transactions._knownTxSet.add(newTx.hash);
                //TODO: Better error handling when sending tx
                await this.chainInterface.provider.broadcastTransaction(signedRawTx).catch(e => {
                    if (e.code === "NONCE_EXPIRED")
                        return;
                    this.logger.error("checkPastTransactions(): Fee-bumped tx broadcast error", e);
                });
            }
        }
    }
    startFeeBumper() {
        let func;
        func = async () => {
            try {
                await this.checkPastTransactions();
            }
            catch (e) {
                this.logger.error("startFeeBumper(): Error when check past transactions: ", e);
            }
            if (this.stopped)
                return;
            this.feeBumper = setTimeout(func, 1000);
        };
        func();
    }
    async syncNonceFromChain() {
        const txCount = await this.chainInterface.provider.getTransactionCount(this.address, this.safeBlockTag);
        this.confirmedNonce = txCount - 1;
        if (this.pendingNonce < this.confirmedNonce) {
            this.logger.info(`syncNonceFromChain(): Re-synced latest nonce from chain, adjusting local pending nonce ${this.pendingNonce} -> ${this.confirmedNonce}`);
            this.pendingNonce = this.confirmedNonce;
            for (let [nonce, data] of this.pendingTxs) {
                if (nonce <= this.pendingNonce) {
                    this.pendingTxs.delete(nonce);
                    data.txs.forEach(tx => this.chainInterface.Transactions._knownTxSet.delete(tx.hash));
                    this.logger.info(`syncNonceFromChain(): Tx confirmed, nonce: ${nonce}, required fee bumps: `, data.txs.length);
                }
            }
            this.save();
        }
    }
    async init() {
        try {
            await fs.mkdir(this.directory);
        }
        catch (e) { }
        const txCount = await this.chainInterface.provider.getTransactionCount(this.address, this.safeBlockTag);
        this.confirmedNonce = txCount - 1;
        this.pendingNonce = txCount - 1;
        await this.load();
        this.startFeeBumper();
    }
    stop() {
        this.stopped = true;
        if (this.feeBumper != null) {
            clearTimeout(this.feeBumper);
            this.feeBumper = null;
        }
        return Promise.resolve();
    }
    sendTransaction(transaction, onBeforePublish) {
        return this.sendTransactionQueue.enqueue(async () => {
            if (transaction.nonce != null) {
                if (transaction.nonce !== this.pendingNonce + 1)
                    throw new Error("Invalid transaction nonce!");
            }
            else {
                transaction.nonce = this.pendingNonce + 1;
            }
            const tx = {};
            for (let key in transaction) {
                if (transaction[key] instanceof Promise) {
                    tx[key] = await transaction[key];
                }
                else {
                    tx[key] = transaction[key];
                }
            }
            const signedRawTx = await this.account.signTransaction(tx);
            const signedTx = ethers_1.Transaction.from(signedRawTx);
            if (onBeforePublish != null) {
                try {
                    await onBeforePublish(signedTx.hash, signedRawTx);
                }
                catch (e) {
                    this.logger.error("sendTransaction(): Error when calling onBeforePublish function: ", e);
                }
            }
            const pendingTxObject = { txs: [signedTx], lastBumped: Date.now(), sending: true };
            this.pendingNonce++;
            this.logger.debug("sendTransaction(): Incrementing pending nonce to: ", this.pendingNonce);
            this.pendingTxs.set(transaction.nonce, pendingTxObject);
            this.save();
            this.chainInterface.Transactions._knownTxSet.add(signedTx.hash);
            try {
                //TODO: This can fail due to not receiving a response from the server, however the transaction
                // might already be broadcasted!
                const result = await this.chainInterface.provider.broadcastTransaction(signedRawTx);
                pendingTxObject.sending = false;
                return result;
            }
            catch (e) {
                this.chainInterface.Transactions._knownTxSet.delete(signedTx.hash);
                this.pendingTxs.delete(transaction.nonce);
                this.pendingNonce--;
                this.logger.debug("sendTransaction(): Error when broadcasting transaction, reverting pending nonce to: ", this.pendingNonce);
                if (e.code === "NONCE_EXPIRED") {
                    //Re-check nonce from on-chain
                    this.logger.info("sendTransaction(): Got NONCE_EXPIRED back from backend, re-checking latest nonce from chain!");
                    await this.syncNonceFromChain();
                }
                throw e;
            }
        });
    }
}
exports.EVMPersistentSigner = EVMPersistentSigner;
