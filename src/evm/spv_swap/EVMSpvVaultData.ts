import {
    SpvVaultClaimEvent,
    SpvVaultCloseEvent,
    SpvVaultData, SpvVaultDepositEvent, SpvVaultOpenEvent,
    SpvVaultTokenBalance,
    SpvVaultTokenData
} from "@atomiqlabs/base";
import {Buffer} from "buffer";
import { EVMSpvWithdrawalData } from "./EVMSpvWithdrawalData";
import {
    SpvVaultParametersStruct,
    SpvVaultStateStruct
} from "./SpvVaultContractTypechain";
import {hexlify, randomBytes} from "ethers";
import {AbiCoder, keccak256} from "ethers";
import {EVMAddresses} from "../chain/modules/EVMAddresses";
import type {AddressLike, BigNumberish, BytesLike} from "ethers/lib.esm";

export function getVaultParamsCommitment(vaultParams: SpvVaultParametersStruct) {
    return keccak256(AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "address", "uint192", "uint192", "uint256"],
        [vaultParams.btcRelayContract, vaultParams.token0, vaultParams.token1, vaultParams.token0Multiplier, vaultParams.token1Multiplier, vaultParams.confirmations]
    ));
}

export function getVaultUtxoFromState(state: SpvVaultStateStruct): string {
    const txHash = Buffer.from(hexlify(state.utxoTxHash).substring(2), "hex");
    return txHash.reverse().toString("hex")+":"+BigInt(state.utxoVout).toString(10);
}

/**
 * @category Swaps
 */
export class EVMSpvVaultData extends SpvVaultData<EVMSpvWithdrawalData> {

    readonly owner: string;
    readonly vaultId: bigint;

    readonly relayContract: string;
    readonly token0: {
        token: string,
        multiplier: bigint,
        rawAmount: bigint
    }
    readonly token1: {
        token: string,
        multiplier: bigint,
        rawAmount: bigint
    };
    readonly initialUtxo?: string;
    utxo: string;
    readonly confirmations: number;
    withdrawCount: number;
    depositCount: number;

    constructor(owner: string, vaultId: bigint, state: SpvVaultStateStruct, params: SpvVaultParametersStruct, initialUtxo?: string);
    constructor(serializedObj: any);
    constructor(ownerOrObj: string | any, vaultId?: bigint, state?: SpvVaultStateStruct, params?: SpvVaultParametersStruct, initialUtxo?: string) {
        super();
        if(typeof(ownerOrObj) === "string") {
            if(vaultId==null) throw new Error("vaultId is null");
            if(state==null) throw new Error("state is null");
            if(params==null) throw new Error("params is null");

            this.owner = ownerOrObj;
            this.vaultId = vaultId;
            this.relayContract = params.btcRelayContract as string;
            this.token0 = {
                token: params.token0 as string,
                multiplier: BigInt(params.token0Multiplier),
                rawAmount: BigInt(state.token0Amount)
            };
            this.token1 = {
                token: params.token1 as string,
                multiplier: BigInt(params.token1Multiplier),
                rawAmount: BigInt(state.token1Amount)
            };
            this.utxo = getVaultUtxoFromState(state);
            this.confirmations = Number(params.confirmations);
            this.withdrawCount = Number(state.withdrawCount);
            this.depositCount = Number(state.depositCount);
            this.initialUtxo = initialUtxo;
        } else {
            this.owner = ownerOrObj.owner;
            this.vaultId = BigInt(ownerOrObj.vaultId);
            this.relayContract = ownerOrObj.relayContract;
            this.token0 = {
                token: ownerOrObj.token0.token,
                multiplier: BigInt(ownerOrObj.token0.multiplier),
                rawAmount: BigInt(ownerOrObj.token0.rawAmount)
            }
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

    getBalances(): SpvVaultTokenBalance[] {
        return [
            {...this.token0, scaledAmount: this.token0.rawAmount * this.token0.multiplier},
            {...this.token1, scaledAmount: this.token1.rawAmount * this.token1.multiplier}
        ];
    }

    getConfirmations(): number {
        return this.confirmations;
    }

    getOwner(): string {
        return this.owner;
    }

    getTokenData(): SpvVaultTokenData[] {
        return [this.token0, this.token1];
    }

    getUtxo(): string {
        return this.isOpened() ? this.utxo : this.initialUtxo!;
    }

    getVaultId(): bigint {
        return this.vaultId;
    }

    getWithdrawalCount(): number {
        return this.withdrawCount;
    }

    isOpened(): boolean {
        return this.utxo!=="0000000000000000000000000000000000000000000000000000000000000000:0";
    }

    serialize(): any {
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
        }
    }

    updateState(withdrawalTxOrEvent: SpvVaultClaimEvent | SpvVaultCloseEvent | SpvVaultOpenEvent | SpvVaultDepositEvent | EVMSpvWithdrawalData): void {
        if(withdrawalTxOrEvent instanceof SpvVaultClaimEvent) {
            if(withdrawalTxOrEvent.withdrawCount <= this.withdrawCount) return;
            this.token0.rawAmount -= withdrawalTxOrEvent.amounts[0];
            this.token1.rawAmount -= withdrawalTxOrEvent.amounts[1];
            this.withdrawCount = withdrawalTxOrEvent.withdrawCount;
            this.utxo = withdrawalTxOrEvent.btcTxId+":0";
        }
        if(withdrawalTxOrEvent instanceof SpvVaultCloseEvent) {
            this.token0.rawAmount = 0n;
            this.token1.rawAmount = 0n;
            this.utxo = "0000000000000000000000000000000000000000000000000000000000000000:0";
        }
        if(withdrawalTxOrEvent instanceof SpvVaultOpenEvent) {
            if(this.isOpened()) return;
            this.utxo = withdrawalTxOrEvent.btcTxId+":"+withdrawalTxOrEvent.vout;
        }
        if(withdrawalTxOrEvent instanceof SpvVaultDepositEvent) {
            if(withdrawalTxOrEvent.depositCount <= this.depositCount) return;
            this.token0.rawAmount += withdrawalTxOrEvent.amounts[0];
            this.token1.rawAmount += withdrawalTxOrEvent.amounts[1];
            this.depositCount = withdrawalTxOrEvent.depositCount;
        }
        if(withdrawalTxOrEvent instanceof EVMSpvWithdrawalData) {
            if(withdrawalTxOrEvent.getSpentVaultUtxo()!==this.utxo) return;
            const amounts = withdrawalTxOrEvent.getTotalOutput();
            this.token0.rawAmount -= amounts[0];
            this.token1.rawAmount -= amounts[1];
            this.withdrawCount++;
            this.utxo = withdrawalTxOrEvent.btcTx.txid+":0";
        }
    }

    getDepositCount(): number {
        return this.depositCount;
    }

    getVaultParamsStruct(): SpvVaultParametersStruct {
        return {
            btcRelayContract: this.relayContract,
            token0: this.token0.token,
            token1: this.token1.token,
            token0Multiplier: this.token0.multiplier,
            token1Multiplier: this.token1.multiplier,
            confirmations: this.confirmations
        }
    }

    static randomVault(): EVMSpvVaultData {
        const spvVaultParams = {
            btcRelayContract: EVMAddresses.randomAddress(),
            token0: EVMAddresses.randomAddress(),
            token1: EVMAddresses.randomAddress(),
            token0Multiplier: 1n,
            token1Multiplier: 1n,
            confirmations: 3n,
        }
        return new EVMSpvVaultData(EVMAddresses.randomAddress(), 0n, {
            spvVaultParametersCommitment: getVaultParamsCommitment(spvVaultParams),
            utxoTxHash: randomBytes(32),
            utxoVout: 0n,
            openBlockheight: 0n,
            withdrawCount: 0n,
            depositCount: 0n,
            token0Amount: 0n,
            token1Amount: 0n
        }, spvVaultParams);
    }

}

SpvVaultData.deserializers["EVM"] = EVMSpvVaultData;
