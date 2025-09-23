/// <reference types="node" />
/// <reference types="node" />
import { BitcoinRpc, BtcTx, RelaySynchronizer, SpvVaultContract, SpvVaultTokenData, SpvWithdrawalState, SpvWithdrawalTransactionData, TransactionConfirmationOptions } from "@atomiqlabs/base";
import { Buffer } from "buffer";
import { EVMTx } from "../chain/modules/EVMTransactions";
import { EVMContractBase } from "../contract/EVMContractBase";
import { EVMSigner } from "../wallet/EVMSigner";
import { SpvVaultManager } from "./SpvVaultContractTypechain";
import { EVMBtcRelay } from "../btcrelay/EVMBtcRelay";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import { TransactionRequest } from "ethers";
import { EVMSpvVaultData } from "./EVMSpvVaultData";
import { EVMSpvWithdrawalData } from "./EVMSpvWithdrawalData";
import { EVMBtcStoredHeader } from "../btcrelay/headers/EVMBtcStoredHeader";
export declare function packOwnerAndVaultId(owner: string, vaultId: bigint): string;
export declare function unpackOwnerAndVaultId(data: string): [string, bigint];
export declare class EVMSpvVaultContract<ChainId extends string> extends EVMContractBase<SpvVaultManager> implements SpvVaultContract<EVMTx, EVMSigner, ChainId, EVMSpvVaultData, EVMSpvWithdrawalData> {
    static readonly GasCosts: {
        DEPOSIT_BASE: number;
        DEPOSIT_ERC20: number;
        OPEN: number;
        CLAIM_BASE: number;
        CLAIM_NATIVE_TRANSFER: number;
        CLAIM_ERC20_TRANSFER: number;
        CLAIM_EXECUTION_SCHEDULE: number;
        FRONT_BASE: number;
        FRONT_NATIVE_TRANSFER: number;
        FRONT_ERC20_TRANSFER: number;
        FRONT_EXECUTION_SCHEDULE: number;
    };
    readonly chainId: ChainId;
    readonly btcRelay: EVMBtcRelay<any>;
    readonly bitcoinRpc: BitcoinRpc<any>;
    readonly claimTimeout: number;
    readonly logger: import("../../utils/Utils").LoggerType;
    constructor(chainInterface: EVMChainInterface<ChainId>, btcRelay: EVMBtcRelay<any>, bitcoinRpc: BitcoinRpc<any>, contractAddress: string, contractDeploymentHeight?: number);
    protected Open(signer: string, vault: EVMSpvVaultData, feeRate: string): Promise<TransactionRequest>;
    protected Deposit(signer: string, vault: EVMSpvVaultData, rawAmounts: bigint[], feeRate: string): Promise<TransactionRequest>;
    protected Front(signer: string, vault: EVMSpvVaultData, data: EVMSpvWithdrawalData, withdrawalSequence: number, feeRate: string): Promise<TransactionRequest>;
    protected Claim(signer: string, vault: EVMSpvVaultData, data: EVMSpvWithdrawalData, blockheader: EVMBtcStoredHeader, merkle: Buffer[], position: number, feeRate: string): Promise<TransactionRequest>;
    checkWithdrawalTx(tx: SpvWithdrawalTransactionData): Promise<void>;
    createVaultData(owner: string, vaultId: bigint, utxo: string, confirmations: number, tokenData: SpvVaultTokenData[]): Promise<EVMSpvVaultData>;
    getFronterAddress(owner: string, vaultId: bigint, withdrawal: EVMSpvWithdrawalData): Promise<string | null>;
    getFronterAddresses(withdrawals: {
        owner: string;
        vaultId: bigint;
        withdrawal: EVMSpvWithdrawalData;
    }[]): Promise<{
        [btcTxId: string]: string | null;
    }>;
    private vaultParamsCache;
    getVaultData(owner: string, vaultId: bigint): Promise<EVMSpvVaultData>;
    getMultipleVaultData(vaults: {
        owner: string;
        vaultId: bigint;
    }[]): Promise<{
        [owner: string]: {
            [vaultId: string]: EVMSpvVaultData;
        };
    }>;
    getVaultLatestUtxo(owner: string, vaultId: bigint): Promise<string | null>;
    getVaultLatestUtxos(vaults: {
        owner: string;
        vaultId: bigint;
    }[]): Promise<{
        [owner: string]: {
            [vaultId: string]: string | null;
        };
    }>;
    getAllVaults(owner?: string): Promise<EVMSpvVaultData[]>;
    private parseWithdrawalEvent;
    getWithdrawalState(withdrawalTx: EVMSpvWithdrawalData, scStartHeight?: number): Promise<SpvWithdrawalState>;
    getWithdrawalStates(withdrawalTxs: {
        withdrawal: EVMSpvWithdrawalData;
        scStartHeight?: number;
    }[]): Promise<{
        [btcTxId: string]: SpvWithdrawalState;
    }>;
    getWithdrawalData(btcTx: BtcTx): Promise<EVMSpvWithdrawalData>;
    fromOpReturnData(data: Buffer): {
        recipient: string;
        rawAmounts: bigint[];
        executionHash: string;
    };
    static fromOpReturnData(data: Buffer): {
        recipient: string;
        rawAmounts: bigint[];
        executionHash: string;
    };
    toOpReturnData(recipient: string, rawAmounts: bigint[], executionHash?: string): Buffer;
    static toOpReturnData(recipient: string, rawAmounts: bigint[], executionHash?: string): Buffer;
    claim(signer: EVMSigner, vault: EVMSpvVaultData, txs: {
        tx: EVMSpvWithdrawalData;
        storedHeader?: EVMBtcStoredHeader;
    }[], synchronizer?: RelaySynchronizer<any, any, any>, initAta?: boolean, txOptions?: TransactionConfirmationOptions): Promise<string>;
    deposit(signer: EVMSigner, vault: EVMSpvVaultData, rawAmounts: bigint[], txOptions?: TransactionConfirmationOptions): Promise<string>;
    frontLiquidity(signer: EVMSigner, vault: EVMSpvVaultData, realWithdrawalTx: EVMSpvWithdrawalData, withdrawSequence: number, txOptions?: TransactionConfirmationOptions): Promise<string>;
    open(signer: EVMSigner, vault: EVMSpvVaultData, txOptions?: TransactionConfirmationOptions): Promise<string>;
    txsClaim(signer: string, vault: EVMSpvVaultData, txs: {
        tx: EVMSpvWithdrawalData;
        storedHeader?: EVMBtcStoredHeader;
    }[], synchronizer?: RelaySynchronizer<any, any, any>, initAta?: boolean, feeRate?: string): Promise<EVMTx[]>;
    txsDeposit(signer: string, vault: EVMSpvVaultData, rawAmounts: bigint[], feeRate?: string): Promise<EVMTx[]>;
    txsFrontLiquidity(signer: string, vault: EVMSpvVaultData, realWithdrawalTx: EVMSpvWithdrawalData, withdrawSequence: number, feeRate?: string): Promise<EVMTx[]>;
    txsOpen(signer: string, vault: EVMSpvVaultData, feeRate?: string): Promise<EVMTx[]>;
    getClaimGas(signer: string, vault: EVMSpvVaultData, data?: EVMSpvWithdrawalData): number;
    getFrontGas(signer: string, vault: EVMSpvVaultData, data?: EVMSpvWithdrawalData): number;
    getClaimFee(signer: string, vault: EVMSpvVaultData, withdrawalData: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint>;
    getFrontFee(signer: string, vault?: EVMSpvVaultData, withdrawalData?: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint>;
}
