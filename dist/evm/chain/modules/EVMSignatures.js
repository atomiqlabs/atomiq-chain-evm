"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSignatures = void 0;
const EVMModule_1 = require("../EVMModule");
const ethers_1 = require("ethers");
const DataHash = [
    { name: "dataHash", type: "bytes32" }
];
class EVMSignatures extends EVMModule_1.EVMModule {
    constructor(root, domainName = "atomiq.exchange") {
        super(root);
        this.domainName = domainName;
    }
    async signTypedMessage(contract, signer, type, typeName, message) {
        return signer.account.signTypedData({
            name: this.domainName,
            version: "1",
            chainId: BigInt(this.root.evmChainId),
            verifyingContract: contract
        }, { [typeName]: type }, message);
    }
    async isValidSignature(contract, signature, address, type, typeName, message) {
        return Promise.resolve(address === (0, ethers_1.verifyTypedData)({
            name: this.domainName,
            version: "1",
            chainId: BigInt(this.root.evmChainId),
            verifyingContract: contract
        }, { [typeName]: type }, message, signature));
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
    getDataSignature(signer, data) {
        return signer.account.signTypedData({
            name: this.domainName,
            version: "1",
            chainId: BigInt(this.root.evmChainId),
            verifyingContract: "0x0000000000000000000000000000000000000000"
        }, { DataHash }, {
            dataHash: (0, ethers_1.sha256)(data)
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
    isValidDataSignature(data, signature, address) {
        return Promise.resolve(address === (0, ethers_1.verifyTypedData)({
            name: this.domainName,
            version: "1",
            chainId: BigInt(this.root.evmChainId),
            verifyingContract: "0x0000000000000000000000000000000000000000"
        }, { DataHash }, {
            dataHash: (0, ethers_1.sha256)(data)
        }, signature));
    }
}
exports.EVMSignatures = EVMSignatures;
