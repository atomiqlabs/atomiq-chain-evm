"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSpvVaultContract = exports.unpackOwnerAndVaultId = exports.packOwnerAndVaultId = void 0;
const base_1 = require("@atomiqlabs/base");
const buffer_1 = require("buffer");
const EVMContractBase_1 = require("../contract/EVMContractBase");
const SpvVaultContractAbi_1 = require("./SpvVaultContractAbi");
const EVMBtcRelay_1 = require("../btcrelay/EVMBtcRelay");
const Utils_1 = require("../../utils/Utils");
const ethers_1 = require("ethers");
const EVMAddresses_1 = require("../chain/modules/EVMAddresses");
const EVMSpvVaultData_1 = require("./EVMSpvVaultData");
const EVMSpvWithdrawalData_1 = require("./EVMSpvWithdrawalData");
const EVMFees_1 = require("../chain/modules/EVMFees");
function decodeUtxo(utxo) {
    const [txId, vout] = utxo.split(":");
    return {
        txHash: "0x" + buffer_1.Buffer.from(txId, "hex").reverse().toString("hex"),
        vout: BigInt(vout)
    };
}
function packOwnerAndVaultId(owner, vaultId) {
    if (owner.length !== 42)
        throw new Error("Invalid owner address");
    return owner.toLowerCase() + base_1.BigIntBufferUtils.toBuffer(vaultId, "be", 12).toString("hex");
}
exports.packOwnerAndVaultId = packOwnerAndVaultId;
function unpackOwnerAndVaultId(data) {
    return [data.substring(0, 82), BigInt("0x" + data.substring(82, 130))];
}
exports.unpackOwnerAndVaultId = unpackOwnerAndVaultId;
class EVMSpvVaultContract extends EVMContractBase_1.EVMContractBase {
    constructor(chainInterface, btcRelay, bitcoinRpc, contractAddress) {
        super(chainInterface, contractAddress, SpvVaultContractAbi_1.SpvVaultContractAbi);
        this.claimTimeout = 180;
        this.logger = (0, Utils_1.getLogger)("EVMSpvVaultContract: ");
        this.btcRelay = btcRelay;
        this.bitcoinRpc = bitcoinRpc;
    }
    //Transactions
    async Open(signer, vault, feeRate) {
        const { txHash, vout } = decodeUtxo(vault.getUtxo());
        const tokens = vault.getTokenData();
        if (tokens.length !== 2)
            throw new Error("Must specify exactly 2 tokens for vault!");
        const tx = await this.contract.open.populateTransaction(vault.vaultId, vault.getVaultParamsStruct(), txHash, vout);
        tx.from = signer;
        EVMFees_1.EVMFees.applyFeeRate(tx, EVMSpvVaultContract.GasCosts.OPEN, feeRate);
        return tx;
    }
    async Deposit(signer, vault, rawAmounts, feeRate) {
        let value = 0n;
        if (vault.token0.token.toLowerCase() === this.Chain.getNativeCurrencyAddress().toLowerCase())
            value += rawAmounts[0] * vault.token0.multiplier;
        if (vault.token1.token.toLowerCase() === this.Chain.getNativeCurrencyAddress().toLowerCase())
            value += (rawAmounts[1] ?? 0n) * vault.token1.multiplier;
        const tx = await this.contract.deposit.populateTransaction(vault.owner, vault.vaultId, vault.getVaultParamsStruct(), rawAmounts[0], rawAmounts[1] ?? 0n, { value });
        tx.from = signer;
        EVMFees_1.EVMFees.applyFeeRate(tx, EVMSpvVaultContract.GasCosts.DEPOSIT, feeRate);
        return tx;
    }
    async Front(signer, vault, data, withdrawalSequence, feeRate) {
        let value = 0n;
        const frontingAmount = data.getFrontingAmount();
        if (vault.token0.token.toLowerCase() === this.Chain.getNativeCurrencyAddress().toLowerCase())
            value += frontingAmount[0] * vault.token0.multiplier;
        if (vault.token1.token.toLowerCase() === this.Chain.getNativeCurrencyAddress().toLowerCase())
            value += (frontingAmount[1] ?? 0n) * vault.token1.multiplier;
        const tx = await this.contract.front.populateTransaction(vault.owner, vault.vaultId, vault.getVaultParamsStruct(), withdrawalSequence, data.getTxHash(), data.serializeToStruct(), { value });
        tx.from = signer;
        EVMFees_1.EVMFees.applyFeeRate(tx, EVMSpvVaultContract.GasCosts.FRONT, feeRate);
        return tx;
    }
    async Claim(signer, vault, data, blockheader, merkle, position, feeRate) {
        const tx = await this.contract.claim.populateTransaction(vault.owner, vault.vaultId, vault.getVaultParamsStruct(), data.btcTx.hex, blockheader.serializeToStruct(), merkle, position);
        tx.from = signer;
        EVMFees_1.EVMFees.applyFeeRate(tx, EVMSpvVaultContract.GasCosts.CLAIM, feeRate);
        return tx;
    }
    async checkWithdrawalTx(tx) {
        const result = await this.contract.parseBitcoinTx(buffer_1.Buffer.from(tx.btcTx.hex, "hex"));
        if (result == null)
            throw new Error("Failed to parse transaction!");
    }
    createVaultData(owner, vaultId, utxo, confirmations, tokenData) {
        if (tokenData.length !== 2)
            throw new Error("Must specify 2 tokens in tokenData!");
        const vaultParams = {
            btcRelayContract: this.btcRelay.contractAddress,
            token0: tokenData[0].token,
            token1: tokenData[1].token,
            token0Multiplier: tokenData[0].multiplier,
            token1Multiplier: tokenData[1].multiplier,
            confirmations: BigInt(confirmations)
        };
        const spvVaultParametersCommitment = (0, ethers_1.keccak256)(ethers_1.AbiCoder.defaultAbiCoder().encode(["address", "address", "address", "uint192", "uint192", "uint256"], [vaultParams.btcRelayContract, vaultParams.token0, vaultParams.token1, vaultParams.token0Multiplier, vaultParams.token1Multiplier, vaultParams.confirmations]));
        return Promise.resolve(new EVMSpvVaultData_1.EVMSpvVaultData(owner, vaultId, {
            spvVaultParametersCommitment,
            utxoTxHash: ethers_1.ZeroHash,
            utxoVout: 0n,
            openBlockheight: 0n,
            withdrawCount: 0n,
            depositCount: 0n,
            token0Amount: 0n,
            token1Amount: 0n
        }, vaultParams, utxo));
    }
    //Getters
    async getVaultData(owner, vaultId) {
        const vaultState = await this.contract.getVault(owner, vaultId);
        const blockheight = Number(vaultState.openBlockheight);
        const events = await this.Events.getContractBlockEvents(["Opened"], [
            "0x" + owner.substring(2).padStart(64, "0"),
            (0, ethers_1.hexlify)(base_1.BigIntBufferUtils.toBuffer(vaultId, "be", 32))
        ], blockheight);
        const foundEvent = events.find(event => (0, EVMSpvVaultData_1.getVaultParamsCommitment)(event.args.params) === vaultState.spvVaultParametersCommitment);
        if (foundEvent == null)
            throw new Error("Valid open event not found!");
        const vaultParams = foundEvent.args.params;
        if (vaultParams.btcRelayContract.toLowerCase() !== this.btcRelay.contractAddress.toLowerCase())
            return null;
        return new EVMSpvVaultData_1.EVMSpvVaultData(owner, vaultId, vaultState, vaultParams);
    }
    async getAllVaults(owner) {
        const openedVaults = new Map();
        await this.Events.findInContractEventsForward(["Opened", "Closed"], owner == null ? null : [
            "0x" + owner.substring(2).padStart(64, "0")
        ], (event) => {
            const vaultIdentifier = event.args.owner + ":" + event.args.vaultId.toString(10);
            if (event.eventName === "Opened") {
                const _event = event;
                openedVaults.set(vaultIdentifier, _event.args.params);
            }
            else {
                openedVaults.delete(vaultIdentifier);
            }
            return null;
        });
        const vaults = [];
        for (let [identifier, vaultParams] of openedVaults.entries()) {
            const [owner, vaultIdStr] = identifier.split(":");
            const vaultState = await this.contract.getVault(owner, BigInt(vaultIdStr));
            if (vaultState.spvVaultParametersCommitment === (0, EVMSpvVaultData_1.getVaultParamsCommitment)(vaultParams)) {
                vaults.push(new EVMSpvVaultData_1.EVMSpvVaultData(owner, BigInt(vaultIdStr), vaultState, vaultParams));
            }
        }
        return vaults;
    }
    async getWithdrawalState(btcTxId) {
        const txHash = buffer_1.Buffer.from(btcTxId, "hex").reverse();
        let result = {
            type: base_1.SpvWithdrawalStateType.NOT_FOUND
        };
        await this.Events.findInContractEvents(["Fronted", "Claimed", "Closed"], [
            null,
            null,
            (0, ethers_1.hexlify)(txHash)
        ], async (event) => {
            switch (event.eventName) {
                case "Fronted":
                    const frontedEvent = event;
                    const [ownerFront, vaultIdFront] = unpackOwnerAndVaultId(frontedEvent.args.ownerAndVaultId);
                    result = {
                        type: base_1.SpvWithdrawalStateType.FRONTED,
                        txId: event.transactionHash,
                        owner: ownerFront,
                        vaultId: vaultIdFront,
                        recipient: frontedEvent.args.recipient,
                        fronter: frontedEvent.args.caller
                    };
                    break;
                case "Claimed":
                    const claimedEvent = event;
                    const [ownerClaim, vaultIdClaim] = unpackOwnerAndVaultId(claimedEvent.args.ownerAndVaultId);
                    result = {
                        type: base_1.SpvWithdrawalStateType.CLAIMED,
                        txId: event.transactionHash,
                        owner: ownerClaim,
                        vaultId: vaultIdClaim,
                        recipient: claimedEvent.args.recipient,
                        claimer: claimedEvent.args.caller,
                        fronter: claimedEvent.args.frontingAddress
                    };
                    break;
                case "Closed":
                    const closedEvent = event;
                    result = {
                        type: base_1.SpvWithdrawalStateType.CLOSED,
                        txId: event.transactionHash,
                        owner: closedEvent.args.owner,
                        vaultId: closedEvent.args.vaultId,
                        error: closedEvent.args.error
                    };
                    break;
            }
        });
        return result;
    }
    getWithdrawalData(btcTx) {
        return Promise.resolve(new EVMSpvWithdrawalData_1.EVMSpvWithdrawalData(btcTx));
    }
    //OP_RETURN data encoding/decoding
    fromOpReturnData(data) {
        return EVMSpvVaultContract.fromOpReturnData(data);
    }
    static fromOpReturnData(data) {
        let rawAmount0 = 0n;
        let rawAmount1 = 0n;
        let executionHash = null;
        if (data.length === 28) {
            rawAmount0 = data.readBigInt64LE(20).valueOf();
        }
        else if (data.length === 36) {
            rawAmount0 = data.readBigInt64LE(20).valueOf();
            rawAmount1 = data.readBigInt64LE(28).valueOf();
        }
        else if (data.length === 60) {
            rawAmount0 = data.readBigInt64LE(20).valueOf();
            executionHash = data.slice(28, 60).toString("hex");
        }
        else if (data.length === 68) {
            rawAmount0 = data.readBigInt64LE(20).valueOf();
            rawAmount1 = data.readBigInt64LE(28).valueOf();
            executionHash = data.slice(36, 68).toString("hex");
        }
        else {
            throw new Error("Invalid OP_RETURN data length!");
        }
        const recipient = "0x" + data.slice(0, 20).toString("hex");
        if (!EVMAddresses_1.EVMAddresses.isValidAddress(recipient))
            throw new Error("Invalid recipient specified");
        return { executionHash, rawAmounts: [rawAmount0, rawAmount1], recipient };
    }
    toOpReturnData(recipient, rawAmounts, executionHash) {
        return EVMSpvVaultContract.toOpReturnData(recipient, rawAmounts, executionHash);
    }
    static toOpReturnData(recipient, rawAmounts, executionHash) {
        if (!EVMAddresses_1.EVMAddresses.isValidAddress(recipient))
            throw new Error("Invalid recipient specified");
        if (rawAmounts.length < 1)
            throw new Error("At least 1 amount needs to be specified");
        if (rawAmounts.length > 2)
            throw new Error("At most 2 amounts need to be specified");
        rawAmounts.forEach(val => {
            if (val < 0n)
                throw new Error("Negative raw amount specified");
            if (val >= 2n ** 64n)
                throw new Error("Raw amount overflow");
        });
        if (executionHash != null) {
            if (buffer_1.Buffer.from(executionHash, "hex").length !== 32)
                throw new Error("Invalid execution hash");
        }
        const recipientBuffer = buffer_1.Buffer.from(recipient.substring(2).padStart(40, "0"), "hex");
        const amount0Buffer = base_1.BigIntBufferUtils.toBuffer(rawAmounts[0], "be", 8);
        const amount1Buffer = rawAmounts[1] == null || rawAmounts[1] === 0n ? buffer_1.Buffer.alloc(0) : base_1.BigIntBufferUtils.toBuffer(rawAmounts[1], "be", 8);
        const executionHashBuffer = executionHash == null ? buffer_1.Buffer.alloc(0) : buffer_1.Buffer.from(executionHash, "hex");
        return buffer_1.Buffer.concat([
            recipientBuffer,
            amount0Buffer.reverse(),
            amount1Buffer.reverse(),
            executionHashBuffer
        ]);
    }
    //Actions
    async claim(signer, vault, txs, synchronizer, initAta, txOptions) {
        const result = await this.txsClaim(signer.getAddress(), vault, txs, synchronizer, initAta, txOptions?.feeRate);
        const [signature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return signature;
    }
    async deposit(signer, vault, rawAmounts, txOptions) {
        const result = await this.txsDeposit(signer.getAddress(), vault, rawAmounts, txOptions?.feeRate);
        const txHashes = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return txHashes[txHashes.length - 1];
    }
    async frontLiquidity(signer, vault, realWithdrawalTx, withdrawSequence, txOptions) {
        const result = await this.txsFrontLiquidity(signer.getAddress(), vault, realWithdrawalTx, withdrawSequence, txOptions?.feeRate);
        const txHashes = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return txHashes[txHashes.length - 1];
    }
    async open(signer, vault, txOptions) {
        const result = await this.txsOpen(signer.getAddress(), vault, txOptions?.feeRate);
        const [signature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return signature;
    }
    //Transactions
    async txsClaim(signer, vault, txs, synchronizer, initAta, feeRate) {
        if (!vault.isOpened())
            throw new Error("Cannot claim from a closed vault!");
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        const txsWithMerkleProofs = [];
        for (let tx of txs) {
            const merkleProof = await this.bitcoinRpc.getMerkleProof(tx.tx.btcTx.txid, tx.tx.btcTx.blockhash);
            this.logger.debug("txsClaim(): merkle proof computed: ", merkleProof);
            txsWithMerkleProofs.push({
                ...merkleProof,
                ...tx
            });
        }
        const evmTxs = [];
        const storedHeaders = await EVMBtcRelay_1.EVMBtcRelay.getCommitedHeadersAndSynchronize(signer, this.btcRelay, txsWithMerkleProofs.filter(tx => tx.storedHeader == null).map(tx => {
            return {
                blockhash: tx.tx.btcTx.blockhash,
                blockheight: tx.blockheight,
                requiredConfirmations: vault.getConfirmations()
            };
        }), evmTxs, synchronizer, feeRate);
        if (storedHeaders == null)
            throw new Error("Cannot fetch committed header!");
        for (let tx of txsWithMerkleProofs) {
            evmTxs.push(await this.Claim(signer, vault, tx.tx, tx.storedHeader ?? storedHeaders[tx.tx.btcTx.blockhash], tx.merkle, tx.pos, feeRate));
        }
        this.logger.debug("txsClaim(): " + evmTxs.length + " claim TXs created claiming " + txs.length + " txs, owner: " + vault.getOwner() +
            " vaultId: " + vault.getVaultId().toString(10));
        return evmTxs;
    }
    async txsDeposit(signer, vault, rawAmounts, feeRate) {
        var _a;
        if (!vault.isOpened())
            throw new Error("Cannot deposit to a closed vault!");
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        const txs = [];
        let realAmount0 = 0n;
        let realAmount1 = 0n;
        //Approve first
        const requiredApprovals = {};
        if (rawAmounts[0] != null && rawAmounts[0] !== 0n) {
            if (vault.token0.token.toLowerCase() !== this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                realAmount0 = rawAmounts[0] * vault.token0.multiplier;
                requiredApprovals[vault.token0.token.toLowerCase()] = realAmount0;
            }
        }
        if (rawAmounts[1] != null && rawAmounts[1] !== 0n) {
            if (vault.token1.token.toLowerCase() !== this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                realAmount1 = rawAmounts[1] * vault.token1.multiplier;
                requiredApprovals[_a = vault.token1.token.toLowerCase()] ?? (requiredApprovals[_a] = 0n);
                requiredApprovals[vault.token1.token.toLowerCase()] += realAmount1;
            }
        }
        for (let tokenAddress in requiredApprovals) {
            txs.push(await this.Chain.Tokens.Approve(signer, tokenAddress, requiredApprovals[tokenAddress], this.contractAddress, feeRate));
        }
        txs.push(await this.Deposit(signer, vault, rawAmounts, feeRate));
        this.logger.debug("txsDeposit(): deposit TX created," +
            " token0: " + vault.token0.token + " rawAmount0: " + rawAmounts[0].toString(10) + " amount0: " + realAmount0.toString(10) +
            " token1: " + vault.token1.token + " rawAmount1: " + (rawAmounts[1] ?? 0n).toString(10) + " amount1: " + realAmount1.toString(10));
        return txs;
    }
    async txsFrontLiquidity(signer, vault, realWithdrawalTx, withdrawSequence, feeRate) {
        var _a;
        if (!vault.isOpened())
            throw new Error("Cannot front on a closed vault!");
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        const txs = [];
        let realAmount0 = 0n;
        let realAmount1 = 0n;
        //Approve first
        const rawAmounts = realWithdrawalTx.getFrontingAmount();
        //Approve first
        const requiredApprovals = {};
        if (rawAmounts[0] != null && rawAmounts[0] !== 0n) {
            if (vault.token0.token.toLowerCase() !== this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                realAmount0 = rawAmounts[0] * vault.token0.multiplier;
                requiredApprovals[vault.token0.token.toLowerCase()] = realAmount0;
            }
        }
        if (rawAmounts[1] != null && rawAmounts[1] !== 0n) {
            if (vault.token1.token.toLowerCase() !== this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                realAmount1 = rawAmounts[1] * vault.token1.multiplier;
                requiredApprovals[_a = vault.token1.token.toLowerCase()] ?? (requiredApprovals[_a] = 0n);
                requiredApprovals[vault.token1.token.toLowerCase()] += realAmount1;
            }
        }
        for (let tokenAddress in requiredApprovals) {
            txs.push(await this.Chain.Tokens.Approve(signer, tokenAddress, requiredApprovals[tokenAddress], this.contractAddress, feeRate));
        }
        txs.push(await this.Front(signer, vault, realWithdrawalTx, withdrawSequence, feeRate));
        this.logger.debug("txsFrontLiquidity(): front TX created," +
            " token0: " + vault.token0.token + " rawAmount0: " + rawAmounts[0].toString(10) + " amount0: " + realAmount0.toString(10) +
            " token1: " + vault.token1.token + " rawAmount1: " + (rawAmounts[1] ?? 0n).toString(10) + " amount1: " + realAmount1.toString(10));
        return txs;
    }
    async txsOpen(signer, vault, feeRate) {
        if (vault.isOpened())
            throw new Error("Cannot open an already opened vault!");
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        const tx = await this.Open(signer, vault, feeRate);
        this.logger.debug("txsOpen(): open TX created, owner: " + vault.getOwner() +
            " vaultId: " + vault.getVaultId().toString(10));
        return [tx];
    }
    async getClaimFee(signer, withdrawalData, feeRate) {
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        return EVMFees_1.EVMFees.getGasFee(EVMSpvVaultContract.GasCosts.CLAIM, feeRate);
    }
    async getFrontFee(signer, withdrawalData, feeRate) {
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        return EVMFees_1.EVMFees.getGasFee(EVMSpvVaultContract.GasCosts.FRONT, feeRate);
    }
}
exports.EVMSpvVaultContract = EVMSpvVaultContract;
EVMSpvVaultContract.GasCosts = {
    DEPOSIT: 150000,
    OPEN: 100000,
    FRONT: 250000,
    CLAIM: 250000
};
