import { Signer } from "ethers";
import { EVMSigner } from "./EVMSigner";
export declare class EVMBrowserSigner extends EVMSigner {
    constructor(account: Signer, address: string);
}
