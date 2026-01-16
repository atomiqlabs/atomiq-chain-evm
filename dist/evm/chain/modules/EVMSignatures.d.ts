/// <reference types="node" />
/// <reference types="node" />
import { EVMSigner } from "../../wallet/EVMSigner";
import { EVMModule } from "../EVMModule";
import { EVMChainInterface } from "../EVMChainInterface";
import { TypedDataField } from "ethers";
/**
 * @category Internal/Chain
 */
export declare class EVMSignatures extends EVMModule<any> {
    private readonly domainName;
    constructor(root: EVMChainInterface<any>, domainName?: string);
    signTypedMessage(contract: string, signer: EVMSigner, type: TypedDataField[], typeName: string, message: object): Promise<string>;
    isValidSignature(contract: string, signature: string, address: string, type: TypedDataField[], typeName: string, message: object): Promise<boolean>;
    /**
     * Produces a signature over the sha256 of a specified data Buffer, only works with providers which
     *  expose their private key (i.e. backend based, not browser wallet based)
     *
     * @param signer
     * @param data data to sign
     */
    getDataSignature(signer: EVMSigner, data: Buffer): Promise<string>;
    /**
     * Checks whether a signature is a valid signature produced by the account over a data message (computes
     *  sha256 hash of the message)
     *
     * @param data signed data
     * @param signature data signature
     * @param address public key of the signer
     */
    isValidDataSignature(data: Buffer, signature: string, address: string): Promise<boolean>;
}
