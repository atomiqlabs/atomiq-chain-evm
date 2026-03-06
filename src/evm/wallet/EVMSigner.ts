import {AbstractSigner} from "@atomiqlabs/base";
import {getAddress, Signer, Transaction, TransactionRequest, TransactionResponse} from "ethers";

/**
 * EVM signer implementation wrapping an ethers {@link Signer}, for browser-based wallet use
 *  {@link EVMBrowserSigner}.
 *
 * @category Wallets
 */
export class EVMSigner implements AbstractSigner {
    type = "AtomiqAbstractSigner" as const;

    account: Signer;
    public readonly address: string;
    public readonly isManagingNoncesInternally: boolean;

    /**
     * Constructs a signer wrapping an ethers {@link Signer}.
     *
     * @param account
     * @param address
     * @param isManagingNoncesInternally
     */
    constructor(account: Signer, address: string, isManagingNoncesInternally: boolean = false) {
        this.account = account;
        this.address = address;
        this.isManagingNoncesInternally = isManagingNoncesInternally;
    }

    /**
     * @inheritDoc
     */
    getAddress(): string {
        return getAddress(this.address);
    }

    /**
     * @inheritDoc
     */
    async signTransaction?(transaction: TransactionRequest): Promise<string> {
        return this.account.signTransaction(transaction);
    }

    /**
     * @inheritDoc
     */
    async sendTransaction(transaction: TransactionRequest, onBeforePublish?: (txId: string, rawTx: string) => Promise<void>): Promise<TransactionResponse> {
        const txResponse = await this.account.sendTransaction(transaction);
        if(onBeforePublish!=null) await onBeforePublish(txResponse.hash, Transaction.from({
            ...txResponse,
            chainId: transaction.chainId
        }).serialized);
        return txResponse;
    }

}
