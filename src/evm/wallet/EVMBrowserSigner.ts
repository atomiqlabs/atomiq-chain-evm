import {Signer} from "ethers";
import {EVMSigner} from "./EVMSigner";


/**
 * Browser-based EVM signer for external wallet integration
 * @category Wallets
 */
export class EVMBrowserSigner extends EVMSigner {

    constructor(account: Signer, address: string) {
        super(account, address, false);
        this.signTransaction = undefined;
    }

}