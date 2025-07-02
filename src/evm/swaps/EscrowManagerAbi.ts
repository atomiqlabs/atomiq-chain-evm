export const EscrowManagerAbi = [
    {
        "inputs": [],
        "name": "InvalidShortString",
        "type": "error"
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
        "inputs": [
            {
                "internalType": "string",
                "name": "str",
                "type": "string"
            }
        ],
        "name": "StringTooLong",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "offerer",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "claimer",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "escrowHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "claimHandler",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "witnessResult",
                "type": "bytes"
            }
        ],
        "name": "Claim",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [],
        "name": "EIP712DomainChanged",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "escrowHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "error",
                "type": "bytes"
            }
        ],
        "name": "ExecutionError",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "offerer",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "claimer",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "escrowHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "claimHandler",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "refundHandler",
                "type": "address"
            }
        ],
        "name": "Initialize",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "offerer",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "claimer",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "escrowHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "refundHandler",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "witnessResult",
                "type": "bytes"
            }
        ],
        "name": "Refund",
        "type": "event"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "offerer",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "claimer",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "flags",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "claimHandler",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "claimData",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "address",
                        "name": "refundHandler",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "refundData",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "uint256",
                        "name": "securityDeposit",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "claimerBounty",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "depositToken",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "successActionCommitment",
                        "type": "bytes32"
                    }
                ],
                "internalType": "struct EscrowData",
                "name": "escrow",
                "type": "tuple"
            },
            {
                "internalType": "bytes",
                "name": "witness",
                "type": "bytes"
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
                "components": [
                    {
                        "internalType": "address",
                        "name": "offerer",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "claimer",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "flags",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "claimHandler",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "claimData",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "address",
                        "name": "refundHandler",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "refundData",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "uint256",
                        "name": "securityDeposit",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "claimerBounty",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "depositToken",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "successActionCommitment",
                        "type": "bytes32"
                    }
                ],
                "internalType": "struct EscrowData",
                "name": "escrow",
                "type": "tuple"
            },
            {
                "internalType": "bytes",
                "name": "witness",
                "type": "bytes"
            },
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "gasLimit",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address[]",
                        "name": "drainTokens",
                        "type": "address[]"
                    },
                    {
                        "components": [
                            {
                                "internalType": "address",
                                "name": "target",
                                "type": "address"
                            },
                            {
                                "internalType": "uint256",
                                "name": "value",
                                "type": "uint256"
                            },
                            {
                                "internalType": "bytes",
                                "name": "data",
                                "type": "bytes"
                            }
                        ],
                        "internalType": "struct ContractCall[]",
                        "name": "calls",
                        "type": "tuple[]"
                    }
                ],
                "internalType": "struct ExecutionAction",
                "name": "successAction",
                "type": "tuple"
            }
        ],
        "name": "claimWithSuccessAction",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "offerer",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "claimer",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "flags",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "claimHandler",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "claimData",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "address",
                        "name": "refundHandler",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "refundData",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "uint256",
                        "name": "securityDeposit",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "claimerBounty",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "depositToken",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "successActionCommitment",
                        "type": "bytes32"
                    }
                ],
                "internalType": "struct EscrowData",
                "name": "escrow",
                "type": "tuple"
            },
            {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
            },
            {
                "internalType": "uint256",
                "name": "timeout",
                "type": "uint256"
            }
        ],
        "name": "cooperativeRefund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "token",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "deposit",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "eip712Domain",
        "outputs": [
            {
                "internalType": "bytes1",
                "name": "fields",
                "type": "bytes1"
            },
            {
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "version",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "chainId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "verifyingContract",
                "type": "address"
            },
            {
                "internalType": "bytes32",
                "name": "salt",
                "type": "bytes32"
            },
            {
                "internalType": "uint256[]",
                "name": "extensions",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "owner",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                    }
                ],
                "internalType": "struct LpVaultBalanceQuery[]",
                "name": "data",
                "type": "tuple[]"
            }
        ],
        "name": "getBalance",
        "outputs": [
            {
                "internalType": "uint256[]",
                "name": "balances",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "escrowHash",
                "type": "bytes32"
            }
        ],
        "name": "getHashState",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint64",
                        "name": "initBlockheight",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "finishBlockheight",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint8",
                        "name": "state",
                        "type": "uint8"
                    }
                ],
                "internalType": "struct EscrowState",
                "name": "result",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32[]",
                "name": "escrowHash",
                "type": "bytes32[]"
            }
        ],
        "name": "getHashStateMultiple",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint64",
                        "name": "initBlockheight",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "finishBlockheight",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint8",
                        "name": "state",
                        "type": "uint8"
                    }
                ],
                "internalType": "struct EscrowState[]",
                "name": "result",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "owner",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "claimHandler",
                        "type": "address"
                    }
                ],
                "internalType": "struct ReputationQuery[]",
                "name": "data",
                "type": "tuple[]"
            }
        ],
        "name": "getReputation",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint224",
                        "name": "amount",
                        "type": "uint224"
                    },
                    {
                        "internalType": "uint32",
                        "name": "count",
                        "type": "uint32"
                    }
                ],
                "internalType": "struct ReputationState[3][]",
                "name": "result",
                "type": "tuple[3][]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "offerer",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "claimer",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "flags",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "claimHandler",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "claimData",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "address",
                        "name": "refundHandler",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "refundData",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "uint256",
                        "name": "securityDeposit",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "claimerBounty",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "depositToken",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "successActionCommitment",
                        "type": "bytes32"
                    }
                ],
                "internalType": "struct EscrowData",
                "name": "escrowData",
                "type": "tuple"
            }
        ],
        "name": "getState",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint64",
                        "name": "initBlockheight",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "finishBlockheight",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint8",
                        "name": "state",
                        "type": "uint8"
                    }
                ],
                "internalType": "struct EscrowState",
                "name": "result",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "offerer",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "claimer",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "flags",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "claimHandler",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "claimData",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "address",
                        "name": "refundHandler",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "refundData",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "uint256",
                        "name": "securityDeposit",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "claimerBounty",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "depositToken",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "successActionCommitment",
                        "type": "bytes32"
                    }
                ],
                "internalType": "struct EscrowData",
                "name": "escrow",
                "type": "tuple"
            },
            {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
            },
            {
                "internalType": "uint256",
                "name": "timeout",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "_extraData",
                "type": "bytes"
            }
        ],
        "name": "initialize",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "offerer",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "claimer",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "flags",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "claimHandler",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "claimData",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "address",
                        "name": "refundHandler",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "refundData",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "uint256",
                        "name": "securityDeposit",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "claimerBounty",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "depositToken",
                        "type": "address"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "successActionCommitment",
                        "type": "bytes32"
                    }
                ],
                "internalType": "struct EscrowData",
                "name": "escrow",
                "type": "tuple"
            },
            {
                "internalType": "bytes",
                "name": "witness",
                "type": "bytes"
            }
        ],
        "name": "refund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "token",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "destination",
                "type": "address"
            }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
