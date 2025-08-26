import * as fs from "fs/promises";
import {FeeData, JsonRpcApiProvider, Transaction, TransactionRequest, TransactionResponse, Wallet} from "ethers";
import {bigIntMax} from "../../utils/Utils";
import {EVMBlockTag} from "../chain/modules/EVMBlocks";

const WAIT_BEFORE_BUMP = 15*1000;
const MIN_FEE_INCREASE_ABSOLUTE = 1n*1_000_000_000n; //1GWei
const MIN_FEE_INCREASE_PPM = 100_000n; // +10%

export class PersistentEVMSigner extends Wallet {

    readonly type: string = "PersistentEVMSigner";

    readonly safeBlockTag: EVMBlockTag;

    private pendingTxs: Map<number, {
        txs: Transaction[],
        lastBumped: number
    }> = new Map();
    private txMap: Map<string, number>;

    private confirmedNonce: number;
    private pendingNonce: number;

    private feeBumper: any;
    private stopped: boolean = false;

    private readonly directory: string;

    readonly waitBeforeBump: number;
    readonly minFeeIncreaseAbsolute: bigint;
    readonly minFeeIncreasePpm: bigint;

    callbacks: ((oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>)[] = [];

    readonly getGasPriceFunc: () => Promise<FeeData>;

    constructor(
        privateKey: string,
        provider: JsonRpcApiProvider,
        directory: string,
        safeBlockTag: EVMBlockTag,
        minFeeIncreaseAbsolute?: bigint,
        minFeeIncreasePpm?: bigint,
        waitBeforeBumpMillis?: number,
        getGasPriceFunc?: () => Promise<FeeData>
    ) {
        super(privateKey, provider);
        this.directory = directory;
        this.minFeeIncreaseAbsolute = minFeeIncreaseAbsolute ?? MIN_FEE_INCREASE_ABSOLUTE;
        this.minFeeIncreasePpm = minFeeIncreasePpm ?? MIN_FEE_INCREASE_PPM;
        this.waitBeforeBump = waitBeforeBumpMillis ?? WAIT_BEFORE_BUMP;
        this.safeBlockTag = safeBlockTag;
        this.getGasPriceFunc = getGasPriceFunc;
    }

    async load() {
        const res = await fs.readFile(this.directory+"/txs.json").catch(e => console.error(e));
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
                    this.txMap.set(tx.hash, tx.nonce);
                }
            }
        }
    }

    private priorSavePromise: Promise<void>;
    private saveCount: number = 0;

    async save() {
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

    async checkPastTransactions() {
        let _gasPrice: FeeData = null;
        let _safeBlockTxCount: number = null;

        for(let [nonce, data] of this.pendingTxs) {
            if(data.lastBumped<Date.now()-this.waitBeforeBump) {
                _safeBlockTxCount = await this.provider.getTransactionCount(this.address, this.safeBlockTag);
                this.confirmedNonce = _safeBlockTxCount;
                if(_safeBlockTxCount > nonce) {
                    this.pendingTxs.delete(nonce);
                    data.txs.forEach(tx => this.txMap.delete(tx.hash));
                    console.log("Tx confirmed, required fee bumps: ", data.txs.length);
                    continue;
                }

                const lastTx = data.txs[data.txs.length-1];
                if(_gasPrice==null) _gasPrice = this.getGasPriceFunc!=null ? await this.getGasPriceFunc() : await this.provider.getFeeData();

                let newTx = lastTx.clone();
                newTx.maxFeePerGas = bigIntMax(_gasPrice.maxFeePerGas, this.minFeeIncreaseAbsolute + (lastTx.maxFeePerGas * (1_000_000n + this.minFeeIncreasePpm) / 1_000_000n));
                newTx.maxPriorityFeePerGas = bigIntMax(_gasPrice.maxPriorityFeePerGas, this.minFeeIncreaseAbsolute + (lastTx.maxPriorityFeePerGas * (1_000_000n + this.minFeeIncreasePpm) / 1_000_000n));

                if(
                    newTx.maxFeePerGas > (this.minFeeIncreaseAbsolute + (_gasPrice.maxFeePerGas * (1_000_000n + this.minFeeIncreasePpm) / 1_000_000n)) &&
                    newTx.maxPriorityFeePerGas > (this.minFeeIncreaseAbsolute + (_gasPrice.maxPriorityFeePerGas * (1_000_000n + this.minFeeIncreasePpm) / 1_000_000n))
                ) {
                    //Too big of an increase over the current fee rate, don't fee bump
                    console.log("Tx yet unconfirmed but not increasing fee for ", lastTx.hash);
                    continue;
                }

                console.log("Bump fee for tx: ", lastTx.hash);

                newTx.signature = null;
                const signedRawTx = await this.signTransaction(newTx);

                //Double check pending txns still has nonce after async signTransaction was called
                if(!this.pendingTxs.has(nonce)) continue;

                newTx = Transaction.from(signedRawTx);

                for(let callback of this.callbacks) {
                    try {
                        await callback(lastTx.hash, lastTx.serialized, newTx.hash, signedRawTx)
                    } catch (e) {
                        console.error(e);
                    }
                }

                data.txs.push(newTx);
                data.lastBumped = Date.now();
                this.save();

                this.txMap.set(newTx.hash, newTx.nonce);

                //TODO: Better error handling when sending tx
                await this.provider.sendTransaction(newTx).catch(e => console.error(e));
            }
        }
    }

    startFeeBumper() {
        let func: () => Promise<void>;
        func = async () => {
            try {
                await this.checkPastTransactions();
            } catch (e) {
                console.error(e);
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

        const txCount = await this.provider.getTransactionCount(this.address, this.safeBlockTag);
        this.confirmedNonce = txCount-1;
        this.pendingNonce = txCount-1;

        await this.load();

        this.startFeeBumper();
    }

    stop() {
        this.stopped = true;
        if(this.feeBumper!=null) {
            clearTimeout(this.feeBumper);
            this.feeBumper = null;
        }
    }

    async signTransaction(transaction: TransactionRequest): Promise<string> {
        transaction.from = this.address;
        return await super.signTransaction(transaction);
    }

    async sendTransaction(transaction: TransactionRequest, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<TransactionResponse> {
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

        const signedRawTx = await this.signTransaction(tx);
        const signedTx = Transaction.from(signedRawTx);

        if(onBeforePublish!=null) {
            try {
                await onBeforePublish(signedTx.hash, signedRawTx);
            } catch (e) {
                console.error(e);
            }
        }

        this.pendingTxs.set(transaction.nonce, {txs: [signedTx], lastBumped: Date.now()});
        this.save();

        this.txMap.set(signedTx.hash, signedTx.nonce);

        return await this.provider.sendTransaction(signedTx);
    }

    isTxPending(txId: string): boolean {
        return this.txMap.has(txId);
    }

    onBeforeTxReplace(callback: (oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>) {
        this.callbacks.push(callback);
    }

    offBeforeTxReplace(callback: (oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>) {
        const index = this.callbacks.indexOf(callback);
        if(index<0) {
            return false;
        }
        this.callbacks.splice(index, 1);
        return true;
    }

}
