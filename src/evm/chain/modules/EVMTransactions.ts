import {EVMModule} from "../EVMModule";
import {
    JsonRpcResult,
    makeError,
    Transaction,
    TransactionRequest,
    TransactionResponse,
    toBeHex,
    Signature, resolveAddress
} from "ethers";
import {timeoutPromise} from "../../../utils/Utils";
import {EVMSigner} from "../../wallet/EVMSigner";
import {TransactionRevertedError} from "@atomiqlabs/base";

export type EVMTx = TransactionRequest;
export type SignedEVMTx = Transaction;

export type EVMTxTrace = {
    from: string,
    gas: string,
    gasused: string,
    to: string,
    input: string,
    output: string,
    error: string,
    revertReason: string,
    calls: EVMTxTrace[],
    type: "CREATE" | "CALL" | "STATICCALL"
};

const MAX_UNCONFIRMED_TXNS = 10;

export class EVMTransactions extends EVMModule<any> {

    private readonly latestConfirmedNonces: {[address: string]: number} = {};
    private readonly latestPendingNonces: {[address: string]: number} = {};
    private readonly latestSignedNonces: {[address: string]: number} = {};

    readonly _cbksBeforeTxReplace: ((oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>)[] = [];
    private readonly cbksBeforeTxSigned: ((tx: TransactionRequest) => Promise<void>)[] = [];
    private cbkSendTransaction?: (tx: string) => Promise<string | null>;

    readonly _knownTxSet: Set<string> = new Set();

    /**
     * Waits for transaction confirmation using HTTP polling
     *
     * @param tx EVM transaction to wait for confirmation for
     * @param abortSignal signal to abort waiting for tx confirmation
     * @private
     */
    private async confirmTransaction(tx: TransactionResponse | Transaction, abortSignal?: AbortSignal): Promise<string> {
        const checkTxns: Set<string> = new Set([tx.hash!]);

        const txReplaceListener = (oldTx: string, oldTxId: string, newTx: string, newTxId: string) => {
            if(checkTxns.has(oldTxId)) checkTxns.add(newTxId);
            return Promise.resolve();
        };
        this.onBeforeTxReplace(txReplaceListener);

        let state = "pending";
        let confirmedTxId: string | null = null;
        while(state==="pending") {
            await timeoutPromise(3000, abortSignal);
            const latestConfirmedNonce = this.latestConfirmedNonces[tx.from!];

            const snapshot = [...checkTxns]; //Iterate over a snapshot
            const totalTxnCount = snapshot.length;
            let notFoundTxns = 0;
            for(let txId of checkTxns) {
                let _state = await this.getTxIdStatus(txId);
                if(_state==="not_found") notFoundTxns++;
                if(_state==="reverted" || _state==="success") {
                    confirmedTxId = txId;
                    state = _state;
                    break;
                }
            }
            if(notFoundTxns===totalTxnCount) { //All not found, check the latest account nonce
                if(latestConfirmedNonce!=null && latestConfirmedNonce>tx.nonce) {
                    //Confirmed nonce is already higher than the TX nonce, meaning the TX got replaced
                    throw new Error("Transaction failed - replaced!");
                }
                this.logger.warn("confirmTransaction(): All transactions not found, fetching the latest account nonce...");
                const _latestConfirmedNonce = this.latestConfirmedNonces[tx.from!];
                const currentLatestNonce = await this.provider.getTransactionCount(tx.from!, this.root.config.safeBlockTag);
                if(_latestConfirmedNonce==null || _latestConfirmedNonce < currentLatestNonce) {
                    this.latestConfirmedNonces[tx.from!] = currentLatestNonce;
                }
            }
        }

        this.offBeforeTxReplace(txReplaceListener);

        const nextAccountNonce = tx.nonce + 1;
        const currentConfirmedNonce = this.latestConfirmedNonces[tx.from!];
        if(currentConfirmedNonce==null || nextAccountNonce > currentConfirmedNonce) {
            this.latestConfirmedNonces[tx.from!] = nextAccountNonce;
        }
        if(state==="reverted") throw new TransactionRevertedError("Transaction reverted!");

        return confirmedTxId!;
    }

    private async applyAccessList(tx: TransactionRequest) {
        let accessListResponse: {
            accessList: {address: string, storageKeys: string[]}[]
        };
        try {
            accessListResponse = await this.provider.send("eth_createAccessList", [{
                from: tx.from,
                to: tx.to,
                value: toBeHex(tx.value ?? 0n),
                input: tx.data,
                data: tx.data
            }, "pending"]);
        } catch (e: any) {
            if(e.code!=="UNKNOWN_ERROR" || e.error?.code!==3) throw e;
            
            //Re-attempt with default pre-populated access list
            accessListResponse = await this.provider.send("eth_createAccessList", [{
                from: tx.from,
                to: tx.to,
                value: toBeHex(tx.value ?? 0n),
                input: tx.data,
                data: tx.data,
                accessList: this.root.config.defaultAccessListAddresses==null
                    ? undefined
                    : this.root.config.defaultAccessListAddresses.map(val => ({address: val, storageKeys: []}))
            }, "pending"]);
        }

        tx.accessList = accessListResponse.accessList;
    }

    /**
     * Prepares starknet transactions, checks if the account is deployed, assigns nonces if needed & calls beforeTxSigned callback
     *
     * @param signer
     * @param txs
     * @param useAccessList Whether to use access lists for sending txns
     * @private
     */
    private async prepareTransactions(signer: EVMSigner, txs: TransactionRequest[], useAccessList?: boolean): Promise<void> {
        for(let tx of txs) {
            tx.chainId = this.root.evmChainId;
            tx.from = signer.getAddress();
        }

        if(!signer.isManagingNoncesInternally) {
            let nonce: number = await this.root.provider.getTransactionCount(signer.getAddress(), "pending");
            const latestKnownNonce = this.latestPendingNonces[signer.getAddress()];
            if(latestKnownNonce!=null && latestKnownNonce > nonce) {
                this.logger.debug("prepareTransactions(): Using nonce from local cache!");
                nonce = latestKnownNonce;
            }

            for(let i=0;i<txs.length;i++) {
                const tx = txs[i];
                if(tx.nonce!=null) nonce = tx.nonce; //Take the nonce from last tx
                if(nonce==null) nonce = await this.root.provider.getTransactionCount(signer.getAddress(), "pending"); //Fetch the nonce
                if(tx.nonce==null) tx.nonce = nonce;

                this.logger.debug("sendAndConfirm(): transaction prepared ("+(i+1)+"/"+txs.length+"), nonce: "+tx.nonce);

                nonce++;
            }
        }

        for(let tx of txs) {
            if(useAccessList) await this.applyAccessList(tx);
            for(let callback of this.cbksBeforeTxSigned) {
                await callback(tx);
            }
        }
    }

    /**
     * Sends out a signed transaction to the RPC
     *
     * @param tx EVM tx to send
     * @param onBeforePublish a callback called before every transaction is published
     * @private
     */
    private async sendSignedTransaction(
        tx: Transaction,
        onBeforePublish?: (txId: string, rawTx: string) => Promise<void>,
    ): Promise<string> {
        if(onBeforePublish!=null) await onBeforePublish(tx.hash!, this.serializeSignedTx(tx));
        this.logger.debug("sendSignedTransaction(): sending transaction: ", tx.hash);

        const serializedTx = tx.serialized;

        let result: string | null = null;
        if(this.cbkSendTransaction!=null) result = await this.cbkSendTransaction(serializedTx);
        if(result==null) {
            const broadcastResult = await this.provider.broadcastTransaction(tx.serialized);
            result = broadcastResult.hash;
        }

        this.logger.info("sendSignedTransaction(): tx sent, txHash: "+result);
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
     * @param onBeforePublish a callback called before every transaction is published, NOTE: callback is not called when using browser-based wallet!
     * @param useAccessLists
     */
    public async sendAndConfirm(
        signer: EVMSigner, txs: TransactionRequest[], waitForConfirmation?: boolean,
        abortSignal?: AbortSignal, parallel?: boolean, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>,
        useAccessLists?: boolean
    ): Promise<string[]> {
        await this.prepareTransactions(signer, txs, useAccessLists ?? this.root.config.useAccessLists);
        const signedTxs: Transaction[] = [];

        //Don't separate the signing process from the sending when using browser-based wallet
        if(signer.signTransaction!=null) for(let i=0;i<txs.length;i++) {
            const tx = txs[i];
            const signedTx = Transaction.from(await signer.signTransaction(tx));
            signedTxs.push(signedTx);
            this.logger.debug("sendAndConfirm(): transaction signed ("+(i+1)+"/"+txs.length+"): "+signedTx);

            const nextAccountNonce = signedTx.nonce + 1;
            const currentSignedNonce = this.latestSignedNonces[signedTx.from!];
            if(currentSignedNonce==null || nextAccountNonce > currentSignedNonce) {
                this.latestSignedNonces[signedTx.from!] = nextAccountNonce;
            }
        }

        this.logger.debug("sendAndConfirm(): sending transactions, count: "+txs.length+
            " waitForConfirmation: "+waitForConfirmation+" parallel: "+parallel);

        let txIds: string[] = [];
        if(parallel) {
            let promises: Promise<string>[] = [];
            for(let i=0;i<txs.length;i++) {
                let tx: TransactionResponse | Transaction;
                if(signer.signTransaction==null) {
                    tx = await signer.sendTransaction(txs[i], onBeforePublish);
                } else {
                    const signedTx = signedTxs[i];
                    await this.sendSignedTransaction(signedTx, onBeforePublish);
                    tx = signedTx;
                }

                const nextAccountNonce = tx.nonce + 1;
                const currentPendingNonce = this.latestPendingNonces[tx.from!];
                if(currentPendingNonce==null || nextAccountNonce > currentPendingNonce) {
                    this.latestPendingNonces[tx.from!] = nextAccountNonce;
                }

                promises.push(this.confirmTransaction(tx, abortSignal));
                if(!waitForConfirmation) txIds.push(tx.hash!);
                this.logger.debug("sendAndConfirm(): transaction sent ("+(i+1)+"/"+signedTxs.length+"): "+tx.hash);
                if(promises.length >= MAX_UNCONFIRMED_TXNS) {
                    if(waitForConfirmation) txIds.push(...await Promise.all(promises));
                    promises = [];
                }
            }
            if(waitForConfirmation && promises.length>0) {
                txIds.push(...await Promise.all(promises));
            }
        } else {
            for(let i=0;i<txs.length;i++) {
                let tx: TransactionResponse | Transaction;
                if(signer.signTransaction==null) {
                    tx = await signer.sendTransaction(txs[i], onBeforePublish);
                } else {
                    const signedTx = signedTxs[i];
                    await this.sendSignedTransaction(signedTx, onBeforePublish);
                    tx = signedTx;
                }

                const nextAccountNonce = tx.nonce + 1;
                const currentPendingNonce = this.latestPendingNonces[tx.from!];
                if(currentPendingNonce==null || nextAccountNonce > currentPendingNonce) {
                    this.latestPendingNonces[tx.from!] = nextAccountNonce;
                }

                const confirmPromise = this.confirmTransaction(tx, abortSignal);
                this.logger.debug("sendAndConfirm(): transaction sent ("+(i+1)+"/"+txs.length+"): "+tx.hash);
                //Don't await the last promise when !waitForConfirmation
                let txHash = tx.hash!;
                if(i<txs.length-1 || waitForConfirmation) txHash = await confirmPromise;
                txIds.push(txHash);
            }
        }

        this.logger.info("sendAndConfirm(): sent transactions, count: "+txs.length+
            " waitForConfirmation: "+waitForConfirmation+" parallel: "+parallel);

        return txIds;
    }

    //TODO: Maybe consolidate this with sendAndConfirm() fn
    public async sendSignedAndConfirm(
        signedTxs: Transaction[], waitForConfirmation?: boolean,
        abortSignal?: AbortSignal, parallel?: boolean, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>
    ): Promise<string[]> {
        this.logger.debug("sendSignedAndConfirm(): sending transactions, count: "+signedTxs.length+
            " waitForConfirmation: "+waitForConfirmation+" parallel: "+parallel);

        let txIds: string[] = [];
        if(parallel) {
            let promises: Promise<string>[] = [];
            for(let i=0;i<signedTxs.length;i++) {
                const signedTx = signedTxs[i]
                await this.sendSignedTransaction(signedTx, onBeforePublish);

                const nextAccountNonce = signedTx.nonce + 1;
                const currentPendingNonce = this.latestPendingNonces[signedTx.from!];
                if(currentPendingNonce==null || nextAccountNonce > currentPendingNonce) {
                    this.latestPendingNonces[signedTx.from!] = nextAccountNonce;
                }

                promises.push(this.confirmTransaction(signedTx, abortSignal));
                if(!waitForConfirmation) txIds.push(signedTx.hash!);
                this.logger.debug("sendAndConfirm(): transaction sent ("+(i+1)+"/"+signedTxs.length+"): "+signedTx.hash);
                if(promises.length >= MAX_UNCONFIRMED_TXNS) {
                    if(waitForConfirmation) txIds.push(...await Promise.all(promises));
                    promises = [];
                }
            }
            if(waitForConfirmation && promises.length>0) {
                txIds.push(...await Promise.all(promises));
            }
        } else {
            for(let i=0;i<signedTxs.length;i++) {
                const signedTx = signedTxs[i];
                await this.sendSignedTransaction(signedTx, onBeforePublish);

                const nextAccountNonce = signedTx.nonce + 1;
                const currentPendingNonce = this.latestPendingNonces[signedTx.from!];
                if(currentPendingNonce==null || nextAccountNonce > currentPendingNonce) {
                    this.latestPendingNonces[signedTx.from!] = nextAccountNonce;
                }

                const confirmPromise = this.confirmTransaction(signedTx, abortSignal);
                this.logger.debug("sendAndConfirm(): transaction sent ("+(i+1)+"/"+signedTxs.length+"): "+signedTx.hash);
                //Don't await the last promise when !waitForConfirmation
                let txHash = signedTx.hash!;
                if(i<signedTxs.length-1 || waitForConfirmation) txHash = await confirmPromise;
                txIds.push(txHash);
            }
        }

        this.logger.info("sendSignedAndConfirm(): sent transactions, count: "+signedTxs.length+
            " waitForConfirmation: "+waitForConfirmation+" parallel: "+parallel);

        return txIds;
    }

    /**
     * Serializes the unsigned EVM transaction
     *
     * @param unsignedTx
     */
    public async serializeUnsignedTx(unsignedTx: TransactionRequest): Promise<string> {
        const tx = Transaction.from({
            ...unsignedTx,
            to: unsignedTx.to==null ? null : await resolveAddress(unsignedTx.to),
            from: unsignedTx.from==null ? null : await resolveAddress(unsignedTx.from),
            authorizationList: unsignedTx.authorizationList==null ? null : unsignedTx.authorizationList.map(val => ({
                ...val,
                nonce: BigInt(val.nonce),
                chainId: BigInt(val.chainId),
                signature: Signature.from(val.signature)
            }))
        });
        return this.serializeSignedTx(tx);
    }

    /**
     * Serializes the signed EVM transaction
     *
     * @param tx
     */
    public serializeSignedTx(tx: Transaction): string {
        return tx.serialized;
    }

    /**
     * Deserializes an unsigned EVM transaction
     *
     * @param unsignedTxData
     */
    public deserializeUnsignedTx(unsignedTxData: string): TransactionRequest {
        return this.deserializeSignedTx(unsignedTxData);
    }

    /**
     * Deserializes signed EVM transaction
     *
     * @param signedTxData
     */
    public deserializeSignedTx(signedTxData: string): Transaction {
        return Transaction.from(signedTxData);
    }

    /**
     * Gets the status of the raw starknet transaction
     *
     * @param tx
     */
    public async getTxStatus(tx: string): Promise<"pending" | "success" | "not_found" | "reverted"> {
        const parsedTx: Transaction = this.deserializeSignedTx(tx);
        return await this.getTxIdStatus(parsedTx.hash!);
    }

    /**
     * Gets the status of the EVM transaction with a specific txId
     *
     * @param txId
     */
    public async getTxIdStatus(txId: string): Promise<"pending" | "success" | "not_found" | "reverted"> {
        const txResponse = await this.provider.getTransaction(txId);
        if(txResponse==null) return this._knownTxSet.has(txId) ? "pending" : "not_found";
        if(txResponse.blockHash==null) return "pending";

        const [safeBlockNumber, txReceipt] = await Promise.all([
            this.root.config.safeBlockTag==="latest"
                ? Promise.resolve(null)
                : this.provider.getBlock(this.root.config.safeBlockTag).then(res => res?.number ?? 0),
            this.provider.getTransactionReceipt(txId)
        ]);

        if(txReceipt==null || (safeBlockNumber!=null && txReceipt.blockNumber > safeBlockNumber)) return "pending";
        if(txReceipt.status===0) return "reverted";
        return "success";
    }

    public onBeforeTxSigned(callback: (tx: TransactionRequest) => Promise<void>): void {
        this.cbksBeforeTxSigned.push(callback);
    }

    public offBeforeTxSigned(callback: (tx: TransactionRequest) => Promise<void>): boolean {
        const index = this.cbksBeforeTxSigned.indexOf(callback);
        if(index===-1) return false;
        this.cbksBeforeTxSigned.splice(index, 1);
        return true;
    }

    public onSendTransaction(callback: (tx: string) => Promise<string>): void {
        this.cbkSendTransaction = callback;
    }

    public offSendTransaction(callback: (tx: string) => Promise<string>): boolean {
        delete this.cbkSendTransaction;
        return true;
    }

    onBeforeTxReplace(callback: (oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>): void {
        this._cbksBeforeTxReplace.push(callback);
    }

    offBeforeTxReplace(callback: (oldTx: string, oldTxId: string, newTx: string, newTxId: string) => Promise<void>): boolean {
        const index = this._cbksBeforeTxReplace.indexOf(callback);
        if(index===-1) return false;
        this._cbksBeforeTxReplace.splice(index, 1);
        return true;
    }

    public traceTransaction(txId: string): Promise<EVMTxTrace> {
        return this.provider.send("debug_traceTransaction", [
            txId,
            {
                tracer: "callTracer"
            }
        ]);
    }

}
