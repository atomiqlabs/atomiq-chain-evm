import {AbstractSigner} from "@atomiqlabs/base";
import {Signer} from "ethers";


export class EVMSigner implements AbstractSigner {

    account: Signer;
    public readonly address: string;
    public readonly isBrowserWallet: boolean;

    constructor(account: Signer, address: string, isBrowserWallet: boolean = false) {
        this.account = account;
        this.address = address;
        this.isBrowserWallet = isBrowserWallet;
    }

    getNonce(): Promise<number> {
        return Promise.resolve(null);
    }

    getAddress(): string {
        return this.address;
    }

}
