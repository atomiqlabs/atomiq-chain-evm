import { SpvVaultClaimEvent, SpvVaultCloseEvent, SpvVaultData, SpvVaultDepositEvent, SpvVaultOpenEvent, SpvVaultTokenBalance, SpvVaultTokenData } from "@atomiqlabs/base";
import { EVMSpvWithdrawalData } from "./EVMSpvWithdrawalData";
import { SpvVaultParametersStruct, SpvVaultStateStruct } from "./SpvVaultContractTypechain";
export declare function getVaultParamsCommitment(vaultParams: SpvVaultParametersStruct): string;
export declare function getVaultUtxoFromState(state: SpvVaultStateStruct): string;
/**
 * @category Swaps
 */
export declare class EVMSpvVaultData extends SpvVaultData<EVMSpvWithdrawalData> {
    readonly owner: string;
    readonly vaultId: bigint;
    readonly relayContract: string;
    readonly token0: {
        token: string;
        multiplier: bigint;
        rawAmount: bigint;
    };
    readonly token1: {
        token: string;
        multiplier: bigint;
        rawAmount: bigint;
    };
    readonly initialUtxo?: string;
    utxo: string;
    readonly confirmations: number;
    withdrawCount: number;
    depositCount: number;
    constructor(owner: string, vaultId: bigint, state: SpvVaultStateStruct, params: SpvVaultParametersStruct, initialUtxo?: string);
    constructor(serializedObj: any);
    getBalances(): SpvVaultTokenBalance[];
    getConfirmations(): number;
    getOwner(): string;
    getTokenData(): SpvVaultTokenData[];
    getUtxo(): string;
    getVaultId(): bigint;
    getWithdrawalCount(): number;
    isOpened(): boolean;
    serialize(): any;
    updateState(withdrawalTxOrEvent: SpvVaultClaimEvent | SpvVaultCloseEvent | SpvVaultOpenEvent | SpvVaultDepositEvent | EVMSpvWithdrawalData): void;
    getDepositCount(): number;
    getVaultParamsStruct(): SpvVaultParametersStruct;
    static randomVault(): EVMSpvVaultData;
}
