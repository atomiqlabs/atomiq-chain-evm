import {Signer} from "ethers";
import {EVMSigner} from "./EVMSigner";


export class EVMBrowserSigner extends EVMSigner {

    constructor(account: Signer, address: string) {
        super(account, address, false);
        this.signTransaction = null;
    }

}