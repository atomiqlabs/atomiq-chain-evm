export const BtcRelayAbi = [
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "bytes32[5]",
                        "name": "data",
                        "type": "bytes32[5]"
                    }
                ],
                "internalType": "struct StoredBlockHeader",
                "name": "storedHeader",
                "type": "tuple"
            },
            {
                "internalType": "bool",
                "name": "clampBlockTarget",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "commitHash",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "blockHash",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "forkId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "submitter",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "startHeight",
                "type": "uint256"
            }
        ],
        "name": "ChainReorg",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "commitHash",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "blockHash",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "forkId",
                "type": "uint256"
            }
        ],
        "name": "StoreForkHeader",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "commitHash",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "blockHash",
                "type": "bytes32"
            }
        ],
        "name": "StoreHeader",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "getBlockheight",
        "outputs": [
            {
                "internalType": "uint32",
                "name": "blockheight",
                "type": "uint32"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getChainwork",
        "outputs": [
            {
                "internalType": "uint224",
                "name": "chainWork",
                "type": "uint224"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "height",
                "type": "uint256"
            }
        ],
        "name": "getCommitHash",
        "outputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getTipCommitHash",
        "outputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "forkId",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "submitForkBlockheaders",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "submitMainBlockheaders",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "submitShortForkBlockheaders",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "bytes32[5]",
                        "name": "data",
                        "type": "bytes32[5]"
                    }
                ],
                "internalType": "struct StoredBlockHeader",
                "name": "storedHeader",
                "type": "tuple"
            }
        ],
        "name": "verifyBlockheader",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "confirmations",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "height",
                "type": "uint256"
            },
            {
                "internalType": "bytes32",
                "name": "commitmentHash",
                "type": "bytes32"
            }
        ],
        "name": "verifyBlockheaderHash",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "confirmations",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;
