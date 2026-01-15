import {EVMSigner} from "../../wallet/EVMSigner";
import {EVMModule} from "../EVMModule";
import {EVMChainInterface} from "../EVMChainInterface";
import {sha256, verifyTypedData, TypedDataField} from "ethers";

const DataHash = [
    { name: "dataHash", type: "bytes32" }
];

/**
 * @category Internal/Chain
 */
export class EVMSignatures extends EVMModule<any> {

    private readonly domainName: string;

    constructor(root: EVMChainInterface<any>, domainName: string = "atomiq.exchange") {
        super(root);
        this.domainName = domainName;
    }

    public async signTypedMessage(contract: string, signer: EVMSigner, type: TypedDataField[], typeName: string, message: object): Promise<string> {
        return signer.account.signTypedData({
            name: this.domainName,
            version: "1",
            chainId: BigInt(this.root.evmChainId),
            verifyingContract: contract
        }, {[typeName]: type}, message);
    }

    public async isValidSignature(contract: string, signature: string, address: string, type: TypedDataField[], typeName: string, message: object): Promise<boolean> {
        return Promise.resolve(address === verifyTypedData({
            name: this.domainName,
            version: "1",
            chainId: BigInt(this.root.evmChainId),
            verifyingContract: contract
        }, {[typeName]: type}, message, signature));
    }

    ///////////////////
    //// Data signatures
    /**
     * Produces a signature over the sha256 of a specified data Buffer, only works with providers which
     *  expose their private key (i.e. backend based, not browser wallet based)
     *
     * @param signer
     * @param data data to sign
     */
    public getDataSignature(signer: EVMSigner, data: Buffer): Promise<string> {
        return signer.account.signTypedData({
            name: this.domainName,
            version: "1",
            chainId: BigInt(this.root.evmChainId),
            verifyingContract: "0x0000000000000000000000000000000000000000"
        }, {DataHash}, {
            dataHash: sha256(data)
        });
    }

    /**
     * Checks whether a signature is a valid signature produced by the account over a data message (computes
     *  sha256 hash of the message)
     *
     * @param data signed data
     * @param signature data signature
     * @param address public key of the signer
     */
    public isValidDataSignature(data: Buffer, signature: string, address: string): Promise<boolean> {
        return Promise.resolve(address === verifyTypedData({
            name: this.domainName,
            version: "1",
            chainId: BigInt(this.root.evmChainId),
            verifyingContract: "0x0000000000000000000000000000000000000000"
        }, {DataHash}, {
            dataHash: sha256(data)
        }, signature));
    }

}
