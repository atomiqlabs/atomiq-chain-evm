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
/**
 * @category Swaps
 */
export declare class EVMSpvVaultContract<ChainId extends string> extends EVMContractBase<SpvVaultManager> implements SpvVaultContract<EVMTx, EVMSigner, ChainId, EVMSpvWithdrawalData, EVMSpvVaultData> {
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
    /**
     * @inheritDoc
     */
    checkWithdrawalTx(tx: SpvWithdrawalTransactionData): Promise<void>;
    /**
     * @inheritDoc
     */
    createVaultData(owner: string, vaultId: bigint, utxo: string, confirmations: number, tokenData: SpvVaultTokenData[]): Promise<EVMSpvVaultData>;
    /**
     * @inheritDoc
     */
    getFronterAddress(owner: string, vaultId: bigint, withdrawal: EVMSpvWithdrawalData): Promise<string | null>;
    /**
     * @inheritDoc
     */
    getFronterAddresses(withdrawals: {
        owner: string;
        vaultId: bigint;
        withdrawal: EVMSpvWithdrawalData;
    }[]): Promise<{
        [btcTxId: string]: string | null;
    }>;
    private vaultParamsCache;
    /**
     * @inheritDoc
     */
    getVaultData(owner: string, vaultId: bigint): Promise<EVMSpvVaultData | null>;
    /**
     * @inheritDoc
     */
    getMultipleVaultData(vaults: {
        owner: string;
        vaultId: bigint;
    }[]): Promise<{
        [owner: string]: {
            [vaultId: string]: EVMSpvVaultData | null;
        };
    }>;
    /**
     * @inheritDoc
     */
    getVaultLatestUtxo(owner: string, vaultId: bigint): Promise<string | null>;
    /**
     * @inheritDoc
     */
    getVaultLatestUtxos(vaults: {
        owner: string;
        vaultId: bigint;
    }[]): Promise<{
        [owner: string]: {
            [vaultId: string]: string | null;
        };
    }>;
    /**
     * @inheritDoc
     */
    getAllVaults(owner?: string): Promise<EVMSpvVaultData[]>;
    private parseWithdrawalEvent;
    /**
     * @inheritDoc
     */
    getWithdrawalState(withdrawalTx: EVMSpvWithdrawalData, scStartHeight?: number): Promise<SpvWithdrawalState>;
    /**
     * @inheritDoc
     */
    getWithdrawalStates(withdrawalTxs: {
        withdrawal: EVMSpvWithdrawalData;
        scStartBlockheight?: number;
    }[]): Promise<{
        [btcTxId: string]: SpvWithdrawalState;
    }>;
    /**
     * @inheritDoc
     */
    getWithdrawalData(btcTx: BtcTx): Promise<EVMSpvWithdrawalData>;
    /**
     * @inheritDoc
     */
    fromOpReturnData(data: Buffer): {
        recipient: string;
        rawAmounts: bigint[];
        executionHash?: string;
    };
    static fromOpReturnData(data: Buffer): {
        recipient: string;
        rawAmounts: bigint[];
        executionHash?: string;
    };
    /**
     * @inheritDoc
     */
    toOpReturnData(recipient: string, rawAmounts: bigint[], executionHash?: string): Buffer;
    static toOpReturnData(recipient: string, rawAmounts: bigint[], executionHash?: string): Buffer;
    /**
     * @inheritDoc
     */
    claim(signer: EVMSigner, vault: EVMSpvVaultData, txs: {
        tx: EVMSpvWithdrawalData;
        storedHeader?: EVMBtcStoredHeader;
    }[], synchronizer?: RelaySynchronizer<any, any, any>, initAta?: boolean, txOptions?: TransactionConfirmationOptions): Promise<string>;
    /**
     * @inheritDoc
     */
    deposit(signer: EVMSigner, vault: EVMSpvVaultData, rawAmounts: bigint[], txOptions?: TransactionConfirmationOptions): Promise<string>;
    /**
     * @inheritDoc
     */
    frontLiquidity(signer: EVMSigner, vault: EVMSpvVaultData, realWithdrawalTx: EVMSpvWithdrawalData, withdrawSequence: number, txOptions?: TransactionConfirmationOptions): Promise<string>;
    /**
     * @inheritDoc
     */
    open(signer: EVMSigner, vault: EVMSpvVaultData, txOptions?: TransactionConfirmationOptions): Promise<string>;
    /**
     * @inheritDoc
     */
    txsClaim(signer: string, vault: EVMSpvVaultData, txs: {
        tx: EVMSpvWithdrawalData;
        storedHeader?: EVMBtcStoredHeader;
    }[], synchronizer?: RelaySynchronizer<any, any, any>, initAta?: boolean, feeRate?: string): Promise<EVMTx[]>;
    /**
     * @inheritDoc
     */
    txsDeposit(signer: string, vault: EVMSpvVaultData, rawAmounts: bigint[], feeRate?: string): Promise<EVMTx[]>;
    /**
     * @inheritDoc
     */
    txsFrontLiquidity(signer: string, vault: EVMSpvVaultData, realWithdrawalTx: EVMSpvWithdrawalData, withdrawSequence: number, feeRate?: string): Promise<EVMTx[]>;
    /**
     * @inheritDoc
     */
    txsOpen(signer: string, vault: EVMSpvVaultData, feeRate?: string): Promise<EVMTx[]>;
    getClaimGas(signer: string, vault?: EVMSpvVaultData, data?: EVMSpvWithdrawalData): number;
    getFrontGas(signer: string, vault: EVMSpvVaultData, data?: EVMSpvWithdrawalData): number;
    /**
     * @inheritDoc
     */
    getClaimFee(signer: string, vault?: EVMSpvVaultData, withdrawalData?: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint>;
    /**
     * @inheritDoc
     */
    getFrontFee(signer: string, vault?: EVMSpvVaultData, withdrawalData?: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint>;
}
