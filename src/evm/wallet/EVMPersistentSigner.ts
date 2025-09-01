import * as fs from "fs/promises";
import {
    Signer,
    Transaction,
    TransactionRequest,
    TransactionResponse
} from "ethers";
import {bigIntMax, getLogger, LoggerType} from "../../utils/Utils";
import {EVMBlockTag} from "../chain/modules/EVMBlocks";
import {EVMChainInterface} from "../chain/EVMChainInterface";
import {EVMFees} from "../chain/modules/EVMFees";
import {EVMSigner} from "./EVMSigner";
import {PromiseQueue} from "promise-queue-ts";

const WAIT_BEFORE_BUMP = 15*1000;
const MIN_FEE_INCREASE_ABSOLUTE = 1n*1_000_000_000n; //1GWei
const MIN_FEE_INCREASE_PPM = 100_000n; // +10%

export class EVMPersistentSigner extends EVMSigner {

    readonly safeBlockTag: EVMBlockTag;

    private pendingTxs: Map<number, {
        txs: Transaction[],
        lastBumped: number,
        sending?: boolean //Not saved
    }> = new Map();

    private confirmedNonce: number;
    private pendingNonce: number;

    private feeBumper: any;
    private stopped: boolean = false;

    private readonly directory: string;

    private readonly waitBeforeBump: number;
    private readonly minFeeIncreaseAbsolute: bigint;
    private readonly minFeeIncreasePpm: bigint;

    private readonly chainInterface: EVMChainInterface;

    private readonly logger: LoggerType;

    constructor(
        account: Signer,
        address: string,
        chainInterface: EVMChainInterface,
        directory: string,
        minFeeIncreaseAbsolute?: bigint,
        minFeeIncreasePpm?: bigint,
        waitBeforeBumpMillis?: number
    ) {
        super(account, address, true);
        this.signTransaction = null;
        this.chainInterface = chainInterface;
        this.directory = directory;
        this.minFeeIncreaseAbsolute = minFeeIncreaseAbsolute ?? MIN_FEE_INCREASE_ABSOLUTE;
        this.minFeeIncreasePpm = minFeeIncreasePpm ?? MIN_FEE_INCREASE_PPM;
        this.waitBeforeBump = waitBeforeBumpMillis ?? WAIT_BEFORE_BUMP;
        this.safeBlockTag = chainInterface.config.safeBlockTag;
        this.logger = getLogger("EVMPersistentSigner("+address+"): ");
    }

    private async load() {
        const fileExists = await fs.access(this.directory+"/txs.json", fs.constants.F_OK).then(() => true).catch(() => false);
        if(!fileExists) return;
        const res = await fs.readFile(this.directory+"/txs.json");
        if(res!=null) {
            const pendingTxs: {
                [nonce: string]: {
                    txs: string[],
                    lastBumped: number
                }
            } = JSON.parse((res as Buffer).toString());

            for(let nonceStr in pendingTxs) {
                const nonceData = pendingTxs[nonceStr];

                const nonce = parseInt(nonceStr);
                if(this.confirmedNonce>=nonce) continue; //Already confirmed

                if(this.pendingNonce<nonce) {
                    this.pendingNonce = nonce;
                }
                const parsedPendingTxns = nonceData.txs.map(Transaction.from);
                this.pendingTxs.set(nonce, {
                    txs: parsedPendingTxns,
                    lastBumped: nonceData.lastBumped
                })
                for(let tx of parsedPendingTxns) {
                    this.chainInterface.Transactions._knownTxSet.add(tx.hash);
                }
            }
        }
    }

    private priorSavePromise: Promise<void>;
    private saveCount: number = 0;

    private async save() {
        const pendingTxs: {
            [nonce: string]: {
                txs: string[],
                lastBumped: number
            }
        } = {};
        for(let [nonce, data] of this.pendingTxs) {
            pendingTxs[nonce.toString(10)] = {
                lastBumped: data.lastBumped,
                txs: data.txs.map(tx => tx.serialized)
            };
        }
        const requiredSaveCount = ++this.saveCount;
        if(this.priorSavePromise!=null) {
            await this.priorSavePromise;
        }
        if(requiredSaveCount===this.saveCount) {
            this.priorSavePromise = fs.writeFile(this.directory+"/txs.json", JSON.stringify(pendingTxs));
            await this.priorSavePromise;
        }
    }

    private async checkPastTransactions() {
        let _gasPrice: {
            baseFee: bigint,
            priorityFee: bigint
        } = null;
        let _safeBlockTxCount: number = null;

        for(let [nonce, data] of this.pendingTxs) {
            if(!data.sending && data.lastBumped<Date.now()-this.waitBeforeBump) {
                _safeBlockTxCount = await this.chainInterface.provider.getTransactionCount(this.address, this.safeBlockTag);
                this.confirmedNonce = _safeBlockTxCount;
                if(_safeBlockTxCount > nonce) {
                    this.pendingTxs.delete(nonce);
                    data.txs.forEach(tx => this.chainInterface.Transactions._knownTxSet.delete(tx.hash));
                    this.logger.info("checkPastTransactions(): Tx confirmed, required fee bumps: ", data.txs.length);
                    this.save();
                    continue;
                }

                const lastTx = data.txs[data.txs.length-1];
                if(_gasPrice==null) {
                    const feeRate = await this.chainInterface.Fees.getFeeRate();
                    const [baseFee, priorityFee] = feeRate.split(",");
                    _gasPrice = {
                        baseFee: BigInt(baseFee),
                        priorityFee: BigInt(priorityFee)
                    };
                }

                let priorityFee = lastTx.maxPriorityFeePerGas;
                let baseFee = lastTx.maxFeePerGas - lastTx.maxPriorityFeePerGas;

                baseFee = bigIntMax(_gasPrice.baseFee, this.minFeeIncreaseAbsolute + (baseFee * (1_000_000n + this.minFeeIncreasePpm) / 1_000_000n));
                priorityFee = bigIntMax(_gasPrice.priorityFee, this.minFeeIncreaseAbsolute + (priorityFee * (1_000_000n + this.minFeeIncreasePpm) / 1_000_000n));

                if(
                    baseFee > (this.minFeeIncreaseAbsolute + (_gasPrice.baseFee * (1_000_000n + this.minFeeIncreasePpm) / 1_000_000n)) &&
                    priorityFee > (this.minFeeIncreaseAbsolute + (_gasPrice.priorityFee * (1_000_000n + this.minFeeIncreasePpm) / 1_000_000n))
                ) {
                    //Too big of an increase over the current fee rate, don't fee bump
                    this.logger.debug("checkPastTransactions(): Tx yet unconfirmed but not increasing fee for ", lastTx.hash);
                    await this.chainInterface.provider.broadcastTransaction(lastTx.serialized).catch(e => {
                        if(e.code==="NONCE_EXPIRED") return;
                        this.logger.error("checkPastTransactions(): Tx re-broadcast error", e)
                    });
                    continue;
                }

                let newTx = lastTx.clone();
                EVMFees.applyFeeRate(newTx, null, baseFee.toString(10)+","+priorityFee.toString(10));
                this.logger.info("checkPastTransactions(): Bump fee for tx: ", lastTx.hash);

                newTx.signature = null;
                const signedRawTx = await this.account.signTransaction(newTx);

                //Double check pending txns still has nonce after async signTransaction was called
                if(!this.pendingTxs.has(nonce)) continue;

                newTx = Transaction.from(signedRawTx);

                for(let callback of this.chainInterface.Transactions._cbksBeforeTxReplace) {
                    try {
                        await callback(lastTx.serialized, lastTx.hash, signedRawTx, newTx.hash)
                    } catch (e) {
                        this.logger.error("checkPastTransactions(): beforeTxReplace callback error: ", e);
                    }
                }

                data.txs.push(newTx);
                data.lastBumped = Date.now();
                this.save();

                this.chainInterface.Transactions._knownTxSet.add(newTx.hash);

                //TODO: Better error handling when sending tx
                await this.chainInterface.provider.broadcastTransaction(signedRawTx).catch(e => {
                    if(e.code==="NONCE_EXPIRED") return;
                    this.logger.error("checkPastTransactions(): Fee-bumped tx broadcast error", e)
                });
            }
        }
    }

    private startFeeBumper() {
        let func: () => Promise<void>;
        func = async () => {
            try {
                await this.checkPastTransactions();
            } catch (e) {
                this.logger.error("startFeeBumper(): Error when check past transactions: ", e);
            }

            if(this.stopped) return;

            this.feeBumper = setTimeout(func, 1000);
        };
        func();
    }

    async init(): Promise<void> {
        try {
            await fs.mkdir(this.directory)
        } catch (e) {}

        const txCount = await this.chainInterface.provider.getTransactionCount(this.address, this.safeBlockTag);
        this.confirmedNonce = txCount-1;
        this.pendingNonce = txCount-1;

        await this.load();

        this.startFeeBumper();
    }

    stop(): Promise<void> {
        this.stopped = true;
        if(this.feeBumper!=null) {
            clearTimeout(this.feeBumper);
            this.feeBumper = null;
        }
        return Promise.resolve();
    }

    private readonly sendTransactionQueue: PromiseQueue = new PromiseQueue();

    sendTransaction(transaction: TransactionRequest, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<TransactionResponse> {
        return this.sendTransactionQueue.enqueue(async () => {
            if(transaction.nonce!=null) {
                if(transaction.nonce !== this.pendingNonce + 1)
                    throw new Error("Invalid transaction nonce!");
                this.pendingNonce++;
            } else {
                this.pendingNonce++;
                transaction.nonce = this.pendingNonce;
            }

            const tx: TransactionRequest = {};
            for(let key in transaction) {
                if(transaction[key] instanceof Promise) {
                    tx[key] = await transaction[key];
                } else {
                    tx[key] = transaction[key];
                }
            }

            const signedRawTx = await this.account.signTransaction(tx);
            const signedTx = Transaction.from(signedRawTx);

            if(onBeforePublish!=null) {
                try {
                    await onBeforePublish(signedTx.hash, signedRawTx);
                } catch (e) {
                    this.logger.error("sendTransaction(): Error when calling onBeforePublish function: ", e);
                }
            }

            const pendingTxObject = {txs: [signedTx], lastBumped: Date.now(), sending: true};
            this.pendingTxs.set(transaction.nonce, pendingTxObject);
            this.save();

            this.chainInterface.Transactions._knownTxSet.add(signedTx.hash);

            try {
                const result = await this.chainInterface.provider.broadcastTransaction(signedRawTx);
                pendingTxObject.sending = false;
                return result;
            } catch (e) {
                this.chainInterface.Transactions._knownTxSet.delete(signedTx.hash);
                this.pendingTxs.delete(transaction.nonce);
                this.pendingNonce--;
                throw e;
            }
        });
    }

}
