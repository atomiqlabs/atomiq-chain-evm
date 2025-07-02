export const SpvVaultContractAbi = [
    {
        "inputs": [
            {
                "internalType": "contract IExecutionContract",
                "name": "executionContract",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "token",
                "type": "address"
            }
        ],
        "name": "SafeERC20FailedOperation",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "ownerAndVaultId",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "recipient",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "btcTxHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "caller",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "executionHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "frontingAddress",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint32",
                "name": "withdrawCount",
                "type": "uint32"
            },
            {
                "indexed": false,
                "internalType": "uint64",
                "name": "amount0",
                "type": "uint64"
            },
            {
                "indexed": false,
                "internalType": "uint64",
                "name": "amount1",
                "type": "uint64"
            }
        ],
        "name": "Claimed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "uint96",
                "name": "vaultId",
                "type": "uint96"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "btcTxHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "error",
                "type": "bytes"
            }
        ],
        "name": "Closed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "ownerAndVaultId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "uint32",
                "name": "depositCount",
                "type": "uint32"
            },
            {
                "indexed": false,
                "internalType": "uint64",
                "name": "amount0",
                "type": "uint64"
            },
            {
                "indexed": false,
                "internalType": "uint64",
                "name": "amount1",
                "type": "uint64"
            }
        ],
        "name": "Deposited",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "ownerAndVaultId",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "recipient",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "btcTxHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "caller",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "executionHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "uint64",
                "name": "amount0",
                "type": "uint64"
            },
            {
                "indexed": false,
                "internalType": "uint64",
                "name": "amount1",
                "type": "uint64"
            }
        ],
        "name": "Fronted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "uint96",
                "name": "vaultId",
                "type": "uint96"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "btcTxHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "uint32",
                "name": "vout",
                "type": "uint32"
            },
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "btcRelayContract",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "token0",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "token1",
                        "type": "address"
                    },
                    {
                        "internalType": "uint192",
                        "name": "token0Multiplier",
                        "type": "uint192"
                    },
                    {
                        "internalType": "uint192",
                        "name": "token1Multiplier",
                        "type": "uint192"
                    },
                    {
                        "internalType": "uint256",
                        "name": "confirmations",
                        "type": "uint256"
                    }
                ],
                "indexed": false,
                "internalType": "struct SpvVaultParameters",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "Opened",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "uint96",
                "name": "vaultId",
                "type": "uint96"
            },
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "btcRelayContract",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "token0",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "token1",
                        "type": "address"
                    },
                    {
                        "internalType": "uint192",
                        "name": "token0Multiplier",
                        "type": "uint192"
                    },
                    {
                        "internalType": "uint192",
                        "name": "token1Multiplier",
                        "type": "uint192"
                    },
                    {
                        "internalType": "uint256",
                        "name": "confirmations",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct SpvVaultParameters",
                "name": "vaultParams",
                "type": "tuple"
            },
            {
                "internalType": "bytes",
                "name": "transaction",
                "type": "bytes"
            },
            {
                "components": [
                    {
                        "internalType": "bytes32[5]",
                        "name": "data",
                        "type": "bytes32[5]"
                    }
                ],
                "internalType": "struct StoredBlockHeader",
                "name": "blockheader",
                "type": "tuple"
            },
            {
                "internalType": "bytes32[]",
                "name": "merkleProof",
                "type": "bytes32[]"
            },
            {
                "internalType": "uint256",
                "name": "position",
                "type": "uint256"
            }
        ],
        "name": "claim",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "uint96",
                "name": "vaultId",
                "type": "uint96"
            },
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "btcRelayContract",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "token0",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "token1",
                        "type": "address"
                    },
                    {
                        "internalType": "uint192",
                        "name": "token0Multiplier",
                        "type": "uint192"
                    },
                    {
                        "internalType": "uint192",
                        "name": "token1Multiplier",
                        "type": "uint192"
                    },
                    {
                        "internalType": "uint256",
                        "name": "confirmations",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct SpvVaultParameters",
                "name": "vaultParams",
                "type": "tuple"
            },
            {
                "internalType": "uint64",
                "name": "rawToken0",
                "type": "uint64"
            },
            {
                "internalType": "uint64",
                "name": "rawToken1",
                "type": "uint64"
            }
        ],
        "name": "deposit",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "uint96",
                "name": "vaultId",
                "type": "uint96"
            },
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "btcRelayContract",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "token0",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "token1",
                        "type": "address"
                    },
                    {
                        "internalType": "uint192",
                        "name": "token0Multiplier",
                        "type": "uint192"
                    },
                    {
                        "internalType": "uint192",
                        "name": "token1Multiplier",
                        "type": "uint192"
                    },
                    {
                        "internalType": "uint256",
                        "name": "confirmations",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct SpvVaultParameters",
                "name": "vaultParams",
                "type": "tuple"
            },
            {
                "internalType": "uint32",
                "name": "withdrawalSequence",
                "type": "uint32"
            },
            {
                "internalType": "bytes32",
                "name": "btcTxHash",
                "type": "bytes32"
            },
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "recipient",
                        "type": "address"
                    },
                    {
                        "internalType": "uint64",
                        "name": "amount0",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "amount1",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "callerFee0",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "callerFee1",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "frontingFee0",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "frontingFee1",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "executionHandlerFeeAmount0",
                        "type": "uint64"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "executionHash",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "uint256",
                        "name": "executionExpiry",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct BitcoinVaultTransactionData",
                "name": "data",
                "type": "tuple"
            }
        ],
        "name": "front",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "uint96",
                "name": "vaultId",
                "type": "uint96"
            },
            {
                "internalType": "bytes32",
                "name": "btcTxHash",
                "type": "bytes32"
            },
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "recipient",
                        "type": "address"
                    },
                    {
                        "internalType": "uint64",
                        "name": "amount0",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "amount1",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "callerFee0",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "callerFee1",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "frontingFee0",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "frontingFee1",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "executionHandlerFeeAmount0",
                        "type": "uint64"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "executionHash",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "uint256",
                        "name": "executionExpiry",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct BitcoinVaultTransactionData",
                "name": "data",
                "type": "tuple"
            }
        ],
        "name": "getFronterAddress",
        "outputs": [
            {
                "internalType": "address",
                "name": "fronter",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "uint96",
                "name": "vaultId",
                "type": "uint96"
            },
            {
                "internalType": "bytes32",
                "name": "frontingId",
                "type": "bytes32"
            }
        ],
        "name": "getFronterById",
        "outputs": [
            {
                "internalType": "address",
                "name": "fronter",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "uint96",
                "name": "vaultId",
                "type": "uint96"
            }
        ],
        "name": "getVault",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "bytes32",
                        "name": "spvVaultParametersCommitment",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "utxoTxHash",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "uint32",
                        "name": "utxoVout",
                        "type": "uint32"
                    },
                    {
                        "internalType": "uint32",
                        "name": "openBlockheight",
                        "type": "uint32"
                    },
                    {
                        "internalType": "uint32",
                        "name": "withdrawCount",
                        "type": "uint32"
                    },
                    {
                        "internalType": "uint32",
                        "name": "depositCount",
                        "type": "uint32"
                    },
                    {
                        "internalType": "uint64",
                        "name": "token0Amount",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "token1Amount",
                        "type": "uint64"
                    }
                ],
                "internalType": "struct SpvVaultState",
                "name": "vault",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint96",
                "name": "vaultId",
                "type": "uint96"
            },
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "btcRelayContract",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "token0",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "token1",
                        "type": "address"
                    },
                    {
                        "internalType": "uint192",
                        "name": "token0Multiplier",
                        "type": "uint192"
                    },
                    {
                        "internalType": "uint192",
                        "name": "token1Multiplier",
                        "type": "uint192"
                    },
                    {
                        "internalType": "uint256",
                        "name": "confirmations",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct SpvVaultParameters",
                "name": "vaultParams",
                "type": "tuple"
            },
            {
                "internalType": "bytes32",
                "name": "utxoTxHash",
                "type": "bytes32"
            },
            {
                "internalType": "uint32",
                "name": "utxoVout",
                "type": "uint32"
            }
        ],
        "name": "open",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes",
                "name": "transaction",
                "type": "bytes"
            }
        ],
        "name": "parseBitcoinTx",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "recipient",
                        "type": "address"
                    },
                    {
                        "internalType": "uint64",
                        "name": "amount0",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "amount1",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "callerFee0",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "callerFee1",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "frontingFee0",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "frontingFee1",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "executionHandlerFeeAmount0",
                        "type": "uint64"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "executionHash",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "uint256",
                        "name": "executionExpiry",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct BitcoinVaultTransactionData",
                "name": "data",
                "type": "tuple"
            }
        ],
        "stateMutability": "pure",
        "type": "function"
    }
];
