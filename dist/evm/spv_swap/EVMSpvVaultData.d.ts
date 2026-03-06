import { SpvVaultClaimEvent, SpvVaultCloseEvent, SpvVaultData, SpvVaultDepositEvent, SpvVaultOpenEvent, SpvVaultTokenBalance, SpvVaultTokenData } from "@atomiqlabs/base";
import { EVMSpvWithdrawalData } from "./EVMSpvWithdrawalData";
import { SpvVaultParametersStruct, SpvVaultStateStruct } from "./SpvVaultContractTypechain";
/**
 * Computes the vault parameter commitment hash used by the on-chain SPV vault state.
 *
 * @category Swaps
 */
export declare function getVaultParamsCommitment(vaultParams: SpvVaultParametersStruct): string;
/**
 * Decodes UTXO reference (`txid:vout`) from the on-chain SPV vault state struct.
 *
 * @category Swaps
 */
export declare function getVaultUtxoFromState(state: SpvVaultStateStruct): string;
/**
 * Represents the state of the EVM SPV vault (UTXO-controlled vault).
 *
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
    /**
     * @inheritDoc
     */
    getBalances(): SpvVaultTokenBalance[];
    /**
     * @inheritDoc
     */
    getConfirmations(): number;
    /**
     * @inheritDoc
     */
    getOwner(): string;
    /**
     * @inheritDoc
     */
    getTokenData(): SpvVaultTokenData[];
    /**
     * @inheritDoc
     */
    getUtxo(): string;
    /**
     * @inheritDoc
     */
    getVaultId(): bigint;
    /**
     * @inheritDoc
     */
    getWithdrawalCount(): number;
    /**
     * @inheritDoc
     */
    isOpened(): boolean;
    /**
     * @inheritDoc
     */
    serialize(): any;
    /**
     * @inheritDoc
     */
    updateState(withdrawalTxOrEvent: SpvVaultClaimEvent | SpvVaultCloseEvent | SpvVaultOpenEvent | SpvVaultDepositEvent | EVMSpvWithdrawalData): void;
    /**
     * @inheritDoc
     */
    getDepositCount(): number;
    getVaultParamsStruct(): SpvVaultParametersStruct;
    static randomVault(): EVMSpvVaultData;
}
