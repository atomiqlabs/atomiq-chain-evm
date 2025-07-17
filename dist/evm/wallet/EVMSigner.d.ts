import { AbstractSigner } from "@atomiqlabs/base";
import { Signer } from "ethers";
export declare class EVMSigner implements AbstractSigner {
    account: Signer;
    readonly address: string;
    readonly isBrowserWallet: boolean;
    constructor(account: Signer, address: string, isBrowserWallet?: boolean);
    getNonce(): Promise<number>;
    getAddress(): string;
}
