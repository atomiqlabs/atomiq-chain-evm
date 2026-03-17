import {AbstractSigner} from "@atomiqlabs/base";
import {getAddress, Signer, Transaction, TransactionRequest, TransactionResponse} from "ethers";

/**
 * EVM signer implementation wrapping an ethers {@link Signer}, for browser-based wallet use
 *  {@link EVMBrowserSigner}.
 *
 * @category Wallets
 */
export class EVMSigner implements AbstractSigner {
    /**
     * A static message, which should be signed by the EVM wallets to generate reproducible entropy. Works when
     *  wallets use signing with deterministic nonce, such that signature over the same message always yields the
     *  same signature (same entropy).
     */
    private static readonly EVM_REPRODUCIBLE_ENTROPY_MESSAGE =
      "Signing this messages generates a reproducible secret to be used on %APPNAME%.\n\nPLEASE DOUBLE CHECK THAT YOU"+
      " ARE ON THE %APPNAME% WEBSITE BEFORE SIGNING THE MESSAGE, SIGNING THIS MESSAGE ON ANY OTHER WEBSITE MIGHT LEAD TO"+
      " LOSS OF FUNDS!";

    /**
     * Returns a static message, which should be signed by the EVM wallets to generate reproducible entropy. Works when
     *  wallets use signing with deterministic nonce, such that signature over the same message always yields the
     *  same signature (same entropy).
     *
     * @param appName Application name to differentiate reproducible entropy generated across different apps
     */
    public static getReproducibleEntropyMessage(appName: string): string {
        return EVMSigner.EVM_REPRODUCIBLE_ENTROPY_MESSAGE.replace(new RegExp("%APPNAME%", 'g'), appName);
    }

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
