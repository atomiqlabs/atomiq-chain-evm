export declare const BtcRelayAbi: readonly [{
    readonly inputs: readonly [{
        readonly components: readonly [{
            readonly internalType: "bytes32[5]";
            readonly name: "data";
            readonly type: "bytes32[5]";
        }];
        readonly internalType: "struct StoredBlockHeader";
        readonly name: "storedHeader";
        readonly type: "tuple";
    }, {
        readonly internalType: "bool";
        readonly name: "clampBlockTarget";
        readonly type: "bool";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "constructor";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "commitHash";
        readonly type: "bytes32";
    }, {
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "blockHash";
        readonly type: "bytes32";
    }, {
        readonly indexed: true;
        readonly internalType: "uint256";
        readonly name: "forkId";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "submitter";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "startHeight";
        readonly type: "uint256";
    }];
    readonly name: "ChainReorg";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "commitHash";
        readonly type: "bytes32";
    }, {
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "blockHash";
        readonly type: "bytes32";
    }, {
        readonly indexed: true;
        readonly internalType: "uint256";
        readonly name: "forkId";
        readonly type: "uint256";
    }];
    readonly name: "StoreForkHeader";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "commitHash";
        readonly type: "bytes32";
    }, {
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "blockHash";
        readonly type: "bytes32";
    }];
    readonly name: "StoreHeader";
    readonly type: "event";
}, {
    readonly inputs: readonly [];
    readonly name: "getBlockheight";
    readonly outputs: readonly [{
        readonly internalType: "uint32";
        readonly name: "blockheight";
        readonly type: "uint32";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "getChainwork";
    readonly outputs: readonly [{
        readonly internalType: "uint224";
        readonly name: "chainWork";
        readonly type: "uint224";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "height";
        readonly type: "uint256";
    }];
    readonly name: "getCommitHash";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "getTipCommitHash";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "forkId";
        readonly type: "uint256";
    }, {
        readonly internalType: "bytes";
        readonly name: "data";
        readonly type: "bytes";
    }];
    readonly name: "submitForkBlockheaders";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "data";
        readonly type: "bytes";
    }];
    readonly name: "submitMainBlockheaders";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "data";
        readonly type: "bytes";
    }];
    readonly name: "submitShortForkBlockheaders";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly components: readonly [{
            readonly internalType: "bytes32[5]";
            readonly name: "data";
            readonly type: "bytes32[5]";
        }];
        readonly internalType: "struct StoredBlockHeader";
        readonly name: "storedHeader";
        readonly type: "tuple";
    }];
    readonly name: "verifyBlockheader";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "confirmations";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "height";
        readonly type: "uint256";
    }, {
        readonly internalType: "bytes32";
        readonly name: "commitmentHash";
        readonly type: "bytes32";
    }];
    readonly name: "verifyBlockheaderHash";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "confirmations";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
