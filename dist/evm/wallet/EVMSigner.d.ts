import { AbstractSigner } from "@atomiqlabs/base";
import { Signer } from "ethers";
export declare class EVMSigner implements AbstractSigner {
    account: Signer;
    readonly address: string;
    constructor(account: Signer, address: string);
    getNonce(): Promise<number>;
    getAddress(): string;
}
