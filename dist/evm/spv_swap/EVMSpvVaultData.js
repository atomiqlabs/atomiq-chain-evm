"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSpvVaultData = exports.getVaultUtxoFromState = exports.getVaultParamsCommitment = void 0;
const base_1 = require("@atomiqlabs/base");
const buffer_1 = require("buffer");
const EVMSpvWithdrawalData_1 = require("./EVMSpvWithdrawalData");
const ethers_1 = require("ethers");
const ethers_2 = require("ethers");
const EVMAddresses_1 = require("../chain/modules/EVMAddresses");
function getVaultParamsCommitment(vaultParams) {
    return (0, ethers_2.keccak256)(ethers_2.AbiCoder.defaultAbiCoder().encode(["address", "address", "address", "uint192", "uint192", "uint256"], [vaultParams.btcRelayContract, vaultParams.token0, vaultParams.token1, vaultParams.token0Multiplier, vaultParams.token1Multiplier, vaultParams.confirmations]));
}
exports.getVaultParamsCommitment = getVaultParamsCommitment;
function getVaultUtxoFromState(state) {
    const txHash = buffer_1.Buffer.from((0, ethers_1.hexlify)(state.utxoTxHash).substring(2), "hex");
    return txHash.reverse().toString("hex") + ":" + BigInt(state.utxoVout).toString(10);
}
exports.getVaultUtxoFromState = getVaultUtxoFromState;
class EVMSpvVaultData extends base_1.SpvVaultData {
    constructor(ownerOrObj, vaultId, state, params, initialUtxo) {
        super();
        if (typeof (ownerOrObj) === "string") {
            if (vaultId == null)
                throw new Error("vaultId is null");
            if (state == null)
                throw new Error("state is null");
            if (params == null)
                throw new Error("params is null");
            this.owner = ownerOrObj;
            this.vaultId = vaultId;
            this.relayContract = params.btcRelayContract;
            this.token0 = {
                token: params.token0,
                multiplier: BigInt(params.token0Multiplier),
                rawAmount: BigInt(state.token0Amount)
            };
            this.token1 = {
                token: params.token1,
                multiplier: BigInt(params.token1Multiplier),
                rawAmount: BigInt(state.token1Amount)
            };
            this.utxo = getVaultUtxoFromState(state);
            this.confirmations = Number(params.confirmations);
            this.withdrawCount = Number(state.withdrawCount);
            this.depositCount = Number(state.depositCount);
            this.initialUtxo = initialUtxo;
        }
        else {
            this.owner = ownerOrObj.owner;
            this.vaultId = BigInt(ownerOrObj.vaultId);
            this.relayContract = ownerOrObj.relayContract;
            this.token0 = {
                token: ownerOrObj.token0.token,
                multiplier: BigInt(ownerOrObj.token0.multiplier),
                rawAmount: BigInt(ownerOrObj.token0.rawAmount)
            };
            this.token1 = {
                token: ownerOrObj.token1.token,
                multiplier: BigInt(ownerOrObj.token1.multiplier),
                rawAmount: BigInt(ownerOrObj.token1.rawAmount)
            };
            this.utxo = ownerOrObj.utxo;
            this.confirmations = ownerOrObj.confirmations;
            this.withdrawCount = ownerOrObj.withdrawCount;
            this.depositCount = ownerOrObj.depositCount;
            this.initialUtxo = ownerOrObj.initialUtxo;
        }
    }
    getBalances() {
        return [
            { ...this.token0, scaledAmount: this.token0.rawAmount * this.token0.multiplier },
            { ...this.token1, scaledAmount: this.token1.rawAmount * this.token1.multiplier }
        ];
    }
    getConfirmations() {
        return this.confirmations;
    }
    getOwner() {
        return this.owner;
    }
    getTokenData() {
        return [this.token0, this.token1];
    }
    getUtxo() {
        return this.isOpened() ? this.utxo : this.initialUtxo;
    }
    getVaultId() {
        return this.vaultId;
    }
    getWithdrawalCount() {
        return this.withdrawCount;
    }
    isOpened() {
        return this.utxo !== "0000000000000000000000000000000000000000000000000000000000000000:0";
    }
    serialize() {
        return {
            type: "EVM",
            owner: this.owner,
            vaultId: this.vaultId.toString(10),
            relayContract: this.relayContract,
            token0: {
                token: this.token0.token,
                multiplier: this.token0.multiplier.toString(10),
                rawAmount: this.token0.rawAmount.toString(10)
            },
            token1: {
                token: this.token1.token,
                multiplier: this.token1.multiplier.toString(10),
                rawAmount: this.token1.rawAmount.toString(10)
            },
            utxo: this.utxo,
            confirmations: this.confirmations,
            withdrawCount: this.withdrawCount,
            depositCount: this.depositCount,
            initialUtxo: this.initialUtxo
        };
    }
    updateState(withdrawalTxOrEvent) {
        if (withdrawalTxOrEvent instanceof base_1.SpvVaultClaimEvent) {
            if (withdrawalTxOrEvent.withdrawCount <= this.withdrawCount)
                return;
            this.token0.rawAmount -= withdrawalTxOrEvent.amounts[0];
            this.token1.rawAmount -= withdrawalTxOrEvent.amounts[1];
            this.withdrawCount = withdrawalTxOrEvent.withdrawCount;
            this.utxo = withdrawalTxOrEvent.btcTxId + ":0";
        }
        if (withdrawalTxOrEvent instanceof base_1.SpvVaultCloseEvent) {
            this.token0.rawAmount = 0n;
            this.token1.rawAmount = 0n;
            this.utxo = "0000000000000000000000000000000000000000000000000000000000000000:0";
        }
        if (withdrawalTxOrEvent instanceof base_1.SpvVaultOpenEvent) {
            if (this.isOpened())
                return;
            this.utxo = withdrawalTxOrEvent.btcTxId + ":" + withdrawalTxOrEvent.vout;
        }
        if (withdrawalTxOrEvent instanceof base_1.SpvVaultDepositEvent) {
            if (withdrawalTxOrEvent.depositCount <= this.depositCount)
                return;
            this.token0.rawAmount += withdrawalTxOrEvent.amounts[0];
            this.token1.rawAmount += withdrawalTxOrEvent.amounts[1];
            this.depositCount = withdrawalTxOrEvent.depositCount;
        }
        if (withdrawalTxOrEvent instanceof EVMSpvWithdrawalData_1.EVMSpvWithdrawalData) {
            if (withdrawalTxOrEvent.getSpentVaultUtxo() !== this.utxo)
                return;
            const amounts = withdrawalTxOrEvent.getTotalOutput();
            this.token0.rawAmount -= amounts[0];
            this.token1.rawAmount -= amounts[1];
            this.withdrawCount++;
            this.utxo = withdrawalTxOrEvent.btcTx.txid + ":0";
        }
    }
    getDepositCount() {
        return this.depositCount;
    }
    getVaultParamsStruct() {
        return {
            btcRelayContract: this.relayContract,
            token0: this.token0.token,
            token1: this.token1.token,
            token0Multiplier: this.token0.multiplier,
            token1Multiplier: this.token1.multiplier,
            confirmations: this.confirmations
        };
    }
    static randomVault() {
        const spvVaultParams = {
            btcRelayContract: EVMAddresses_1.EVMAddresses.randomAddress(),
            token0: EVMAddresses_1.EVMAddresses.randomAddress(),
            token1: EVMAddresses_1.EVMAddresses.randomAddress(),
            token0Multiplier: 1n,
            token1Multiplier: 1n,
            confirmations: 3n,
        };
        return new EVMSpvVaultData(EVMAddresses_1.EVMAddresses.randomAddress(), 0n, {
            spvVaultParametersCommitment: getVaultParamsCommitment(spvVaultParams),
            utxoTxHash: (0, ethers_1.randomBytes)(32),
            utxoVout: 0n,
            openBlockheight: 0n,
            withdrawCount: 0n,
            depositCount: 0n,
            token0Amount: 0n,
            token1Amount: 0n
        }, spvVaultParams);
    }
}
exports.EVMSpvVaultData = EVMSpvVaultData;
base_1.SpvVaultData.deserializers["EVM"] = EVMSpvVaultData;
