import {AbstractSigner} from "@atomiqlabs/base";
import {Signer} from "ethers";


export class EVMSigner implements AbstractSigner {

    account: Signer;
    public readonly address: string;

    constructor(account: Signer, address: string) {
        this.account = account;
        this.address = address;
    }

    getNonce(): Promise<number> {
        return Promise.resolve(null);
    }

    getAddress(): string {
        return this.address;
    }

}
