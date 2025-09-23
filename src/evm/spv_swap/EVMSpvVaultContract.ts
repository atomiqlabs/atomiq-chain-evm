import {
    BigIntBufferUtils,
    BitcoinRpc,
    BtcTx,
    RelaySynchronizer,
    SpvVaultContract,
    SpvVaultTokenData,
    SpvWithdrawalState,
    SpvWithdrawalStateType,
    SpvWithdrawalTransactionData,
    TransactionConfirmationOptions
} from "@atomiqlabs/base";
import {Buffer} from "buffer";
import {EVMTx} from "../chain/modules/EVMTransactions";
import {EVMContractBase} from "../contract/EVMContractBase";
import {EVMSigner} from "../wallet/EVMSigner";
import {SpvVaultContractAbi} from "./SpvVaultContractAbi";
import {SpvVaultManager, SpvVaultParametersStructOutput} from "./SpvVaultContractTypechain";
import {EVMBtcRelay} from "../btcrelay/EVMBtcRelay";
import {getLogger} from "../../utils/Utils";
import {EVMChainInterface} from "../chain/EVMChainInterface";
import {AbiCoder, getAddress, hexlify, keccak256, TransactionRequest, ZeroAddress, ZeroHash} from "ethers";
import {EVMAddresses} from "../chain/modules/EVMAddresses";
import {EVMSpvVaultData, getVaultParamsCommitment, getVaultUtxoFromState} from "./EVMSpvVaultData";
import {EVMSpvWithdrawalData} from "./EVMSpvWithdrawalData";
import {EVMFees} from "../chain/modules/EVMFees";
import {EVMBtcStoredHeader} from "../btcrelay/headers/EVMBtcStoredHeader";
import {TypedEventLog} from "../typechain/common";
import {PromiseLruCache} from "promise-cache-ts";

function decodeUtxo(utxo: string): {txHash: string, vout: bigint} {
    const [txId, vout] = utxo.split(":");
    return {
        txHash: "0x"+Buffer.from(txId, "hex").reverse().toString("hex"),
        vout: BigInt(vout)
    }
}

export function packOwnerAndVaultId(owner: string, vaultId: bigint): string {
    if(owner.length!==42) throw new Error("Invalid owner address");
    return owner.toLowerCase() + BigIntBufferUtils.toBuffer(vaultId, "be", 12).toString("hex");
}

export function unpackOwnerAndVaultId(data: string): [string, bigint] {
    return [getAddress(data.substring(0, 42)), BigInt("0x"+data.substring(42, 66))];
}

export class EVMSpvVaultContract<ChainId extends string>
    extends EVMContractBase<SpvVaultManager>
    implements SpvVaultContract<
        EVMTx,
        EVMSigner,
        ChainId,
        EVMSpvVaultData,
        EVMSpvWithdrawalData
    >
{
    public static readonly GasCosts = {
        DEPOSIT_BASE: 15_000 + 21_000,
        DEPOSIT_ERC20: 40_000,

        OPEN: 80_000 + 21_000,

        CLAIM_BASE: 85_000 + 21_000,
        CLAIM_NATIVE_TRANSFER: 35_000,
        CLAIM_ERC20_TRANSFER: 40_000,
        CLAIM_EXECUTION_SCHEDULE: 30_000,

        FRONT_BASE: 75_000 + 21_000,
        FRONT_NATIVE_TRANSFER: 35_000,
        FRONT_ERC20_TRANSFER: 40_000,
        FRONT_EXECUTION_SCHEDULE: 30_000
    };

    readonly chainId: ChainId;

    readonly btcRelay: EVMBtcRelay<any>;
    readonly bitcoinRpc: BitcoinRpc<any>;
    readonly claimTimeout: number = 180;

    readonly logger = getLogger("EVMSpvVaultContract: ");

    constructor(
        chainInterface: EVMChainInterface<ChainId>,
        btcRelay: EVMBtcRelay<any>,
        bitcoinRpc: BitcoinRpc<any>,
        contractAddress: string,
        contractDeploymentHeight?: number
    ) {
        super(chainInterface, contractAddress, SpvVaultContractAbi, contractDeploymentHeight);
        this.btcRelay = btcRelay;
        this.bitcoinRpc = bitcoinRpc;
    }

    //Transactions
    protected async Open(signer: string, vault: EVMSpvVaultData, feeRate: string): Promise<TransactionRequest> {
        const {txHash, vout} = decodeUtxo(vault.getUtxo());

        const tokens = vault.getTokenData();
        if(tokens.length!==2) throw new Error("Must specify exactly 2 tokens for vault!");

        const tx = await this.contract.open.populateTransaction(vault.vaultId, vault.getVaultParamsStruct(), txHash, vout);
        tx.from = signer;
        EVMFees.applyFeeRate(tx, EVMSpvVaultContract.GasCosts.OPEN, feeRate);

        return tx;
    }

    protected async Deposit(signer: string, vault: EVMSpvVaultData, rawAmounts: bigint[], feeRate: string): Promise<TransactionRequest> {
        let totalGas = EVMSpvVaultContract.GasCosts.DEPOSIT_BASE;
        let value = 0n;
        if(vault.token0.token.toLowerCase()===this.Chain.getNativeCurrencyAddress().toLowerCase()) {
            value += rawAmounts[0] * vault.token0.multiplier;
        } else {
            if(rawAmounts[0] > 0n) totalGas += EVMSpvVaultContract.GasCosts.DEPOSIT_ERC20;
        }
        if(vault.token1.token.toLowerCase()===this.Chain.getNativeCurrencyAddress().toLowerCase()) {
            value += (rawAmounts[1] ?? 0n) * vault.token1.multiplier;
        } else {
            if(rawAmounts[1]!=null && rawAmounts[1] > 0n && vault.token0.token.toLowerCase()!==vault.token1.token.toLowerCase())
                totalGas += EVMSpvVaultContract.GasCosts.DEPOSIT_ERC20;
        }

        const tx = await this.contract.deposit.populateTransaction(
            vault.owner, vault.vaultId, vault.getVaultParamsStruct(),
            rawAmounts[0], rawAmounts[1] ?? 0n, { value }
        );
        tx.from = signer;
        EVMFees.applyFeeRate(tx, totalGas, feeRate);

        return tx;
    }

    protected async Front(
        signer: string, vault: EVMSpvVaultData, data: EVMSpvWithdrawalData, withdrawalSequence: number, feeRate: string
    ): Promise<TransactionRequest> {
        let value = 0n;
        const frontingAmount = data.getFrontingAmount();
        if(vault.token0.token.toLowerCase()===this.Chain.getNativeCurrencyAddress().toLowerCase())
            value += frontingAmount[0] * vault.token0.multiplier;
        if(vault.token1.token.toLowerCase()===this.Chain.getNativeCurrencyAddress().toLowerCase())
            value += (frontingAmount[1] ?? 0n) * vault.token1.multiplier;

        const tx = await this.contract.front.populateTransaction(
            vault.owner, vault.vaultId, vault.getVaultParamsStruct(),
            withdrawalSequence, data.getTxHash(), data.serializeToStruct(),
            { value }
        );
        tx.from = signer;
        EVMFees.applyFeeRate(tx, this.getFrontGas(signer, vault, data), feeRate);

        return tx;
    }

    protected async Claim(
        signer: string, vault: EVMSpvVaultData, data: EVMSpvWithdrawalData,
        blockheader: EVMBtcStoredHeader, merkle: Buffer[], position: number, feeRate: string
    ): Promise<TransactionRequest> {
        const tx = await this.contract.claim.populateTransaction(
            vault.owner, vault.vaultId, vault.getVaultParamsStruct(), "0x"+data.btcTx.hex,
            blockheader.serializeToStruct(), merkle, position
        )

        tx.from = signer;
        EVMFees.applyFeeRate(tx, this.getClaimGas(signer, vault, data), feeRate);

        return tx;
    }

    async checkWithdrawalTx(tx: SpvWithdrawalTransactionData): Promise<void> {
        const result = await this.contract.parseBitcoinTx(Buffer.from(tx.btcTx.hex, "hex"));
        if(result==null) throw new Error("Failed to parse transaction!");
    }

    createVaultData(
        owner: string, vaultId: bigint, utxo: string, confirmations: number, tokenData: SpvVaultTokenData[]
    ): Promise<EVMSpvVaultData> {
        if(tokenData.length!==2) throw new Error("Must specify 2 tokens in tokenData!");

        const vaultParams = {
            btcRelayContract: this.btcRelay.contractAddress,
            token0: tokenData[0].token,
            token1: tokenData[1].token,
            token0Multiplier: tokenData[0].multiplier,
            token1Multiplier: tokenData[1].multiplier,
            confirmations: BigInt(confirmations)
        };

        const spvVaultParametersCommitment = keccak256(AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "address", "uint192", "uint192", "uint256"],
            [vaultParams.btcRelayContract, vaultParams.token0, vaultParams.token1, vaultParams.token0Multiplier, vaultParams.token1Multiplier, vaultParams.confirmations]
        ));

        return Promise.resolve(new EVMSpvVaultData(owner, vaultId, {
            spvVaultParametersCommitment,
            utxoTxHash: ZeroHash,
            utxoVout: 0n,
            openBlockheight: 0n,
            withdrawCount: 0n,
            depositCount: 0n,
            token0Amount: 0n,
            token1Amount: 0n
        }, vaultParams, utxo));
    }

    //Getters
    async getFronterAddress(owner: string, vaultId: bigint, withdrawal: EVMSpvWithdrawalData): Promise<string | null> {
        const frontingAddress = await this.contract.getFronterById(owner, vaultId, "0x"+withdrawal.getFrontingId());
        if(frontingAddress===ZeroAddress) return null;
        return frontingAddress;
    }

    async getFronterAddresses(withdrawals: {owner: string, vaultId: bigint, withdrawal: EVMSpvWithdrawalData}[]): Promise<{[btcTxId: string]: string | null}> {
        const result: {
            [btcTxId: string]: string | null
        } = {};
        let promises: Promise<void>[] = [];
        //TODO: We can upgrade this to use multicall
        for(let {owner, vaultId, withdrawal} of withdrawals) {
            promises.push(this.getFronterAddress(owner, vaultId, withdrawal).then(val => {
                result[withdrawal.getTxId()] = val;
            }));
            if(promises.length>=this.Chain.config.maxParallelCalls) {
                await Promise.all(promises);
                promises = [];
            }
        }
        await Promise.all(promises);
        return result;
    }

    private vaultParamsCache: PromiseLruCache<string, SpvVaultParametersStructOutput> = new PromiseLruCache<string, SpvVaultParametersStructOutput>(5000);

    async getVaultData(owner: string, vaultId: bigint): Promise<EVMSpvVaultData> {
        const vaultState = await this.contract.getVault(owner, vaultId);

        const vaultParams = await this.vaultParamsCache.getOrComputeAsync(vaultState.spvVaultParametersCommitment, async () => {
            const blockheight = Number(vaultState.openBlockheight);
            const events = await this.Events.getContractBlockEvents(
                ["Opened"],
                [
                    "0x"+owner.substring(2).padStart(64, "0"),
                    hexlify(BigIntBufferUtils.toBuffer(vaultId, "be", 32))
                ],
                blockheight
            );

            const foundEvent = events.find(
                event => getVaultParamsCommitment(event.args.params)===vaultState.spvVaultParametersCommitment
            );
            if(foundEvent==null) throw new Error("Valid open event not found!");

            return foundEvent.args.params;
        });

        if(vaultParams.btcRelayContract.toLowerCase()!==this.btcRelay.contractAddress.toLowerCase()) return null;

        return new EVMSpvVaultData(owner, vaultId, vaultState, vaultParams);
    }

    async getMultipleVaultData(vaults: {owner: string, vaultId: bigint}[]): Promise<{[owner: string]: {[vaultId: string]: EVMSpvVaultData}}> {
        const result: {[owner: string]: {[vaultId: string]: EVMSpvVaultData}} = {};
        let promises: Promise<void>[] = [];
        //TODO: We can upgrade this to use multicall
        for(let {owner, vaultId} of vaults) {
            promises.push(this.getVaultData(owner, vaultId).then(val => {
                result[owner] ??= {};
                result[owner][vaultId.toString(10)] = val;
            }));
            if(promises.length>=this.Chain.config.maxParallelCalls) {
                await Promise.all(promises);
                promises = [];
            }
        }
        await Promise.all(promises);
        return result;
    }

    async getVaultLatestUtxo(owner: string, vaultId: bigint): Promise<string | null> {
        const vaultState = await this.contract.getVault(owner, vaultId);
        const utxo = getVaultUtxoFromState(vaultState);
        if(utxo==="0000000000000000000000000000000000000000000000000000000000000000:0") return null;
        return utxo;
    }

    async getVaultLatestUtxos(vaults: {owner: string, vaultId: bigint}[]): Promise<{[owner: string]: {[vaultId: string]: string | null}}> {
        const result: {[owner: string]: {[vaultId: string]: string | null}} = {};
        let promises: Promise<void>[] = [];
        //TODO: We can upgrade this to use multicall
        for(let {owner, vaultId} of vaults) {
            promises.push(this.getVaultLatestUtxo(owner, vaultId).then(val => {
                result[owner] ??= {};
                result[owner][vaultId.toString(10)] = val;
            }));
            if(promises.length>=this.Chain.config.maxParallelCalls) {
                await Promise.all(promises);
                promises = [];
            }
        }
        await Promise.all(promises);
        return result;
    }

    async getAllVaults(owner?: string): Promise<EVMSpvVaultData[]> {
        const openedVaults = new Map<string, SpvVaultParametersStructOutput>();
        await this.Events.findInContractEventsForward(
            ["Opened", "Closed"],
            owner==null ? null : [
                "0x"+owner.substring(2).padStart(64, "0")
            ],
            (event) => {
                const vaultIdentifier = event.args.owner+":"+event.args.vaultId.toString(10);
                if(event.eventName==="Opened") {
                    const _event = event as TypedEventLog<SpvVaultManager["filters"]["Opened"]>;
                    openedVaults.set(vaultIdentifier, _event.args.params);
                } else {
                    openedVaults.delete(vaultIdentifier);
                }
                return null;
            }
        );
        const vaults: EVMSpvVaultData[] = [];
        for(let [identifier, vaultParams] of openedVaults.entries()) {
            const [owner, vaultIdStr] = identifier.split(":");

            const vaultState = await this.contract.getVault(owner, BigInt(vaultIdStr));
            if(vaultState.spvVaultParametersCommitment === getVaultParamsCommitment(vaultParams)) {
                vaults.push(new EVMSpvVaultData(owner, BigInt(vaultIdStr), vaultState, vaultParams))
            }
        }
        return vaults;
    }

    private parseWithdrawalEvent(event: TypedEventLog<SpvVaultManager["filters"][keyof SpvVaultManager["filters"]]>): SpvWithdrawalState | null {
        switch(event.eventName) {
            case "Fronted":
                const frontedEvent = event as TypedEventLog<SpvVaultManager["filters"]["Fronted"]>;
                const [ownerFront, vaultIdFront] = unpackOwnerAndVaultId(frontedEvent.args.ownerAndVaultId);
                return {
                    type: SpvWithdrawalStateType.FRONTED,
                    txId: event.transactionHash,
                    owner: ownerFront,
                    vaultId: vaultIdFront,
                    recipient: frontedEvent.args.recipient,
                    fronter: frontedEvent.args.caller
                };
            case "Claimed":
                const claimedEvent = event as TypedEventLog<SpvVaultManager["filters"]["Claimed"]>;
                const [ownerClaim, vaultIdClaim] = unpackOwnerAndVaultId(claimedEvent.args.ownerAndVaultId);
                return {
                    type: SpvWithdrawalStateType.CLAIMED,
                    txId: event.transactionHash,
                    owner: ownerClaim,
                    vaultId: vaultIdClaim,
                    recipient: claimedEvent.args.recipient,
                    claimer: claimedEvent.args.caller,
                    fronter: claimedEvent.args.frontingAddress
                };
            case "Closed":
                const closedEvent = event as TypedEventLog<SpvVaultManager["filters"]["Closed"]>;
                return {
                    type: SpvWithdrawalStateType.CLOSED,
                    txId: event.transactionHash,
                    owner: closedEvent.args.owner,
                    vaultId: closedEvent.args.vaultId,
                    error: closedEvent.args.error
                };
            default:
                return null;
        }
    }

    async getWithdrawalState(withdrawalTx: EVMSpvWithdrawalData, scStartHeight?: number): Promise<SpvWithdrawalState> {
        const txHash = Buffer.from(withdrawalTx.getTxId(), "hex").reverse();

        const events: ["Fronted", "Claimed", "Closed"] = ["Fronted", "Claimed", "Closed"];
        const keys = [null, null, hexlify(txHash)];

        let result: SpvWithdrawalState;
        if(scStartHeight==null) {
            result = await this.Events.findInContractEvents(
                events, keys,
                async (event) => {
                    const result = this.parseWithdrawalEvent(event);
                    if(result!=null) return result;
                }
            );
        } else {
            result = await this.Events.findInContractEventsForward(
                events, keys,
                async (event) => {
                    const result = this.parseWithdrawalEvent(event);
                    if(result==null) return;
                    if(result.type===SpvWithdrawalStateType.FRONTED) {
                        //Check if still fronted
                        const fronterAddress = await this.getFronterAddress(result.owner, result.vaultId, withdrawalTx);
                        //Not fronted now, there should be a claim/close event after the front event, continue
                        if(fronterAddress==null) return;
                    }
                    return result;
                },
                scStartHeight
            );
        }
        result ??= {
            type: SpvWithdrawalStateType.NOT_FOUND
        };
        return result;
    }

    async getWithdrawalStates(withdrawalTxs: {withdrawal: EVMSpvWithdrawalData, scStartHeight?: number}[]): Promise<{[btcTxId: string]: SpvWithdrawalState}> {
        const result: {[btcTxId: string]: SpvWithdrawalState} = {};

        const events: ["Fronted", "Claimed", "Closed"] = ["Fronted", "Claimed", "Closed"];

        for(let i=0;i<withdrawalTxs.length;i+=this.Chain.config.maxLogTopics) {
            const checkWithdrawalTxs = withdrawalTxs.slice(i, i+this.Chain.config.maxLogTopics);
            const checkWithdrawalTxsMap = new Map(checkWithdrawalTxs.map(val => [val.withdrawal.getTxId() as string, val.withdrawal]));

            let scStartHeight = null;
            for(let val of checkWithdrawalTxs) {
                if(val.scStartHeight==null) {
                    scStartHeight = null;
                    break;
                }
                scStartHeight = Math.min(scStartHeight ?? Infinity, val.scStartHeight);
            }

            const keys = [null, null, checkWithdrawalTxs.map(withdrawal => hexlify(Buffer.from(withdrawal.withdrawal.getTxId(), "hex").reverse()))];

            if(scStartHeight==null) {
                await this.Events.findInContractEvents(
                    events, keys,
                    async (event) => {
                        const _event = event as TypedEventLog<SpvVaultManager["filters"]["Fronted" | "Claimed" | "Closed"]>;
                        const btcTxId = Buffer.from(_event.args.btcTxHash.substring(2), "hex").reverse().toString("hex");
                        if(!checkWithdrawalTxsMap.has(btcTxId)) {
                            this.logger.warn(`getWithdrawalStates(): findInContractEvents-callback: loaded event for ${btcTxId}, but transaction not found in input params!`)
                            return null;
                        }
                        const eventResult = this.parseWithdrawalEvent(event);
                        if(eventResult==null) return null;
                        checkWithdrawalTxsMap.delete(btcTxId);
                        result[btcTxId] = eventResult;
                        if(checkWithdrawalTxsMap.size===0) return true; //All processed
                    }
                );
            } else {
                await this.Events.findInContractEventsForward(
                    events, keys,
                    async (event) => {
                        const _event = event as TypedEventLog<SpvVaultManager["filters"]["Fronted" | "Claimed" | "Closed"]>;
                        const btcTxId = Buffer.from(_event.args.btcTxHash.substring(2), "hex").reverse().toString("hex");
                        const withdrawalTx = checkWithdrawalTxsMap.get(btcTxId);
                        if(withdrawalTx==null) {
                            this.logger.warn(`getWithdrawalStates(): findInContractEvents-callback: loaded event for ${btcTxId}, but transaction not found in input params!`)
                            return;
                        }
                        const eventResult = this.parseWithdrawalEvent(event);
                        if(eventResult==null) return;

                        if(eventResult.type===SpvWithdrawalStateType.FRONTED) {
                            //Check if still fronted
                            const fronterAddress = await this.getFronterAddress(eventResult.owner, eventResult.vaultId, withdrawalTx);
                            //Not fronted now, so there should be a claim/close event after the front event, continue
                            if(fronterAddress==null) return;
                            //Fronted still, so this should be the latest current state
                        }

                        checkWithdrawalTxsMap.delete(btcTxId);
                        result[btcTxId] = eventResult;
                        if(checkWithdrawalTxsMap.size===0) return true; //All processed
                    },
                    scStartHeight
                );
            }
        }

        for(let val of withdrawalTxs) {
            result[val.withdrawal.getTxId()] ??= {
                type: SpvWithdrawalStateType.NOT_FOUND
            };
        }

        return result;
    }

    getWithdrawalData(btcTx: BtcTx): Promise<EVMSpvWithdrawalData> {
        return Promise.resolve(new EVMSpvWithdrawalData(btcTx));
    }

    //OP_RETURN data encoding/decoding
    fromOpReturnData(data: Buffer): { recipient: string; rawAmounts: bigint[]; executionHash: string } {
        return EVMSpvVaultContract.fromOpReturnData(data);
    }
    static fromOpReturnData(data: Buffer): { recipient: string; rawAmounts: bigint[]; executionHash: string } {
        let rawAmount0: bigint = 0n;
        let rawAmount1: bigint = 0n;
        let executionHash: string = null;
        if(data.length===28) {
            rawAmount0 = data.readBigInt64BE(20).valueOf();
        } else if(data.length===36) {
            rawAmount0 = data.readBigInt64BE(20).valueOf();
            rawAmount1 = data.readBigInt64BE(28).valueOf();
        } else if(data.length===60) {
            rawAmount0 = data.readBigInt64BE(20).valueOf();
            executionHash = data.slice(28, 60).toString("hex");
        } else if(data.length===68) {
            rawAmount0 = data.readBigInt64BE(20).valueOf();
            rawAmount1 = data.readBigInt64BE(28).valueOf();
            executionHash = data.slice(36, 68).toString("hex");
        } else {
            throw new Error("Invalid OP_RETURN data length!");
        }

        const recipient = "0x"+data.slice(0, 20).toString("hex");
        if(!EVMAddresses.isValidAddress(recipient)) throw new Error("Invalid recipient specified");

        return {executionHash, rawAmounts: [rawAmount0, rawAmount1], recipient: getAddress(recipient)};
    }

    toOpReturnData(recipient: string, rawAmounts: bigint[], executionHash?: string): Buffer {
        return EVMSpvVaultContract.toOpReturnData(recipient, rawAmounts, executionHash);
    }
    static toOpReturnData(recipient: string, rawAmounts: bigint[], executionHash?: string): Buffer {
        if(!EVMAddresses.isValidAddress(recipient)) throw new Error("Invalid recipient specified");
        if(rawAmounts.length < 1) throw new Error("At least 1 amount needs to be specified");
        if(rawAmounts.length > 2) throw new Error("At most 2 amounts need to be specified");
        rawAmounts.forEach(val => {
            if(val < 0n) throw new Error("Negative raw amount specified");
            if(val >= 2n**64n) throw new Error("Raw amount overflow");
        });
        if(executionHash!=null) {
            if(Buffer.from(executionHash, "hex").length !== 32)
                throw new Error("Invalid execution hash");
        }
        const recipientBuffer = Buffer.from(recipient.substring(2).padStart(40, "0"), "hex");
        const amount0Buffer = BigIntBufferUtils.toBuffer(rawAmounts[0], "be", 8);
        const amount1Buffer = rawAmounts[1]==null || rawAmounts[1]===0n ? Buffer.alloc(0) : BigIntBufferUtils.toBuffer(rawAmounts[1], "be", 8);
        const executionHashBuffer = executionHash==null ? Buffer.alloc(0) : Buffer.from(executionHash, "hex");

        return Buffer.concat([
            recipientBuffer,
            amount0Buffer,
            amount1Buffer,
            executionHashBuffer
        ]);
    }

    //Actions
    async claim(signer: EVMSigner, vault: EVMSpvVaultData, txs: {tx: EVMSpvWithdrawalData, storedHeader?: EVMBtcStoredHeader}[], synchronizer?: RelaySynchronizer<any, any, any>, initAta?: boolean, txOptions?: TransactionConfirmationOptions): Promise<string> {
        const result = await this.txsClaim(signer.getAddress(), vault, txs, synchronizer, initAta, txOptions?.feeRate);
        const [signature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return signature;
    }

    async deposit(signer: EVMSigner, vault: EVMSpvVaultData, rawAmounts: bigint[], txOptions?: TransactionConfirmationOptions): Promise<string> {
        const result = await this.txsDeposit(signer.getAddress(), vault, rawAmounts, txOptions?.feeRate);
        const txHashes = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return txHashes[txHashes.length - 1];
    }

    async frontLiquidity(signer: EVMSigner, vault: EVMSpvVaultData, realWithdrawalTx: EVMSpvWithdrawalData, withdrawSequence: number, txOptions?: TransactionConfirmationOptions): Promise<string> {
        const result = await this.txsFrontLiquidity(signer.getAddress(), vault, realWithdrawalTx, withdrawSequence, txOptions?.feeRate);
        const txHashes = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return txHashes[txHashes.length - 1];
    }

    async open(signer: EVMSigner, vault: EVMSpvVaultData, txOptions?: TransactionConfirmationOptions): Promise<string> {
        const result = await this.txsOpen(signer.getAddress(), vault, txOptions?.feeRate);
        const [signature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return signature;
    }

    //Transactions
    async txsClaim(
        signer: string, vault: EVMSpvVaultData, txs: {
            tx: EVMSpvWithdrawalData,
            storedHeader?: EVMBtcStoredHeader
        }[], synchronizer?: RelaySynchronizer<any, any, any>,
        initAta?: boolean, feeRate?: string
    ): Promise<EVMTx[]> {
        if(!vault.isOpened()) throw new Error("Cannot claim from a closed vault!");
        feeRate ??= await this.Chain.Fees.getFeeRate();

        const txsWithMerkleProofs: {
            tx: EVMSpvWithdrawalData,
            reversedTxId: Buffer,
            pos: number,
            blockheight: number,
            merkle: Buffer[],
            storedHeader?: EVMBtcStoredHeader
        }[] = [];
        for(let tx of txs) {
            const merkleProof = await this.bitcoinRpc.getMerkleProof(tx.tx.btcTx.txid, tx.tx.btcTx.blockhash);
            this.logger.debug("txsClaim(): merkle proof computed: ", merkleProof);
            txsWithMerkleProofs.push({
                ...merkleProof,
                ...tx
            });
        }

        const evmTxs: EVMTx[] = [];
        const storedHeaders: {[blockhash: string]: EVMBtcStoredHeader} = await EVMBtcRelay.getCommitedHeadersAndSynchronize(
            signer, this.btcRelay, txsWithMerkleProofs.filter(tx => tx.storedHeader==null).map(tx => {
                return {
                    blockhash: tx.tx.btcTx.blockhash,
                    blockheight: tx.blockheight,
                    requiredConfirmations: vault.getConfirmations()
                }
            }), evmTxs, synchronizer, feeRate
        );
        if(storedHeaders==null) throw new Error("Cannot fetch committed header!");

        for(let tx of txsWithMerkleProofs) {
            evmTxs.push(await this.Claim(signer, vault, tx.tx, tx.storedHeader ?? storedHeaders[tx.tx.btcTx.blockhash], tx.merkle, tx.pos, feeRate));
        }

        this.logger.debug("txsClaim(): "+evmTxs.length+" claim TXs created claiming "+txs.length+" txs, owner: "+vault.getOwner()+
            " vaultId: "+vault.getVaultId().toString(10));

        return evmTxs;
    }

    async txsDeposit(signer: string, vault: EVMSpvVaultData, rawAmounts: bigint[], feeRate?: string): Promise<EVMTx[]> {
        if(!vault.isOpened()) throw new Error("Cannot deposit to a closed vault!");
        feeRate ??= await this.Chain.Fees.getFeeRate();

        const txs: EVMTx[] = [];

        let realAmount0: bigint = 0n;
        let realAmount1: bigint = 0n;

        //Approve first
        const requiredApprovals: {[address: string]: bigint} = {};
        if(rawAmounts[0]!=null && rawAmounts[0]!==0n) {
            if(vault.token0.token.toLowerCase()!==this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                realAmount0 = rawAmounts[0] * vault.token0.multiplier;
                requiredApprovals[vault.token0.token.toLowerCase()] = realAmount0;
            }
        }
        if(rawAmounts[1]!=null && rawAmounts[1]!==0n) {
            if(vault.token1.token.toLowerCase()!==this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                realAmount1 = rawAmounts[1] * vault.token1.multiplier;
                requiredApprovals[vault.token1.token.toLowerCase()] ??= 0n;
                requiredApprovals[vault.token1.token.toLowerCase()] += realAmount1;
            }
        }

        const requiredApprovalTxns = await Promise.all(
            Object.keys(requiredApprovals).map(token => this.Chain.Tokens.checkAndGetApproveTx(signer, token, requiredApprovals[token], this.contractAddress, feeRate))
        );
        requiredApprovalTxns.forEach(tx => tx!=null && txs.push(tx));

        txs.push(await this.Deposit(signer, vault, rawAmounts, feeRate));

        this.logger.debug("txsDeposit(): deposit TX created,"+
            " token0: "+vault.token0.token+" rawAmount0: "+rawAmounts[0].toString(10)+" amount0: "+realAmount0.toString(10)+
            " token1: "+vault.token1.token+" rawAmount1: "+(rawAmounts[1] ?? 0n).toString(10)+" amount1: "+realAmount1.toString(10));

        return txs;
    }

    async txsFrontLiquidity(signer: string, vault: EVMSpvVaultData, realWithdrawalTx: EVMSpvWithdrawalData, withdrawSequence: number, feeRate?: string): Promise<EVMTx[]> {
        if(!vault.isOpened()) throw new Error("Cannot front on a closed vault!");
        feeRate ??= await this.Chain.Fees.getFeeRate();

        const txs: EVMTx[] = [];

        let realAmount0 = 0n;
        let realAmount1 = 0n;

        //Approve first
        const rawAmounts = realWithdrawalTx.getFrontingAmount();
        //Approve first
        const requiredApprovals: {[address: string]: bigint} = {};
        if(rawAmounts[0]!=null && rawAmounts[0]!==0n) {
            if(vault.token0.token.toLowerCase()!==this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                realAmount0 = rawAmounts[0] * vault.token0.multiplier;
                requiredApprovals[vault.token0.token.toLowerCase()] = realAmount0;
            }
        }
        if(rawAmounts[1]!=null && rawAmounts[1]!==0n) {
            if(vault.token1.token.toLowerCase()!==this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                realAmount1 = rawAmounts[1] * vault.token1.multiplier;
                requiredApprovals[vault.token1.token.toLowerCase()] ??= 0n;
                requiredApprovals[vault.token1.token.toLowerCase()] += realAmount1;
            }
        }

        const requiredApprovalTxns = await Promise.all(
            Object.keys(requiredApprovals).map(token => this.Chain.Tokens.checkAndGetApproveTx(signer, token, requiredApprovals[token], this.contractAddress, feeRate))
        );
        requiredApprovalTxns.forEach(tx => tx!=null && txs.push(tx));

        txs.push(await this.Front(signer, vault, realWithdrawalTx, withdrawSequence, feeRate));

        this.logger.debug("txsFrontLiquidity(): front TX created,"+
            " token0: "+vault.token0.token+" rawAmount0: "+rawAmounts[0].toString(10)+" amount0: "+realAmount0.toString(10)+
            " token1: "+vault.token1.token+" rawAmount1: "+(rawAmounts[1] ?? 0n).toString(10)+" amount1: "+realAmount1.toString(10));

        return txs;
    }

    async txsOpen(signer: string, vault: EVMSpvVaultData, feeRate?: string): Promise<EVMTx[]> {
        if(vault.isOpened()) throw new Error("Cannot open an already opened vault!");
        feeRate ??= await this.Chain.Fees.getFeeRate();

        const tx = await this.Open(signer, vault, feeRate);

        this.logger.debug("txsOpen(): open TX created, owner: "+vault.getOwner()+
            " vaultId: "+vault.getVaultId().toString(10));

        return [tx];
    }

    getClaimGas(signer: string, vault: EVMSpvVaultData, data?: EVMSpvWithdrawalData): number {
        let totalGas = EVMSpvVaultContract.GasCosts.CLAIM_BASE;

        if (data==null || (data.rawAmounts[0] != null && data.rawAmounts[0] > 0n)) {
            const transferFee = vault.token0.token.toLowerCase() === this.Chain.getNativeCurrencyAddress() ?
                EVMSpvVaultContract.GasCosts.CLAIM_NATIVE_TRANSFER : EVMSpvVaultContract.GasCosts.CLAIM_ERC20_TRANSFER;
            totalGas += transferFee;
            if (data==null || data.frontingFeeRate > 0n) totalGas += transferFee; //Also needs to pay out to fronter
            if (data==null || (data.callerFeeRate > 0n && !data.isRecipient(signer))) totalGas += transferFee; //Also needs to pay out to caller
        }
        if (data==null || (data.rawAmounts[1] != null && data.rawAmounts[1] > 0n)) {
            const transferFee = vault.token1.token.toLowerCase() === this.Chain.getNativeCurrencyAddress() ?
                EVMSpvVaultContract.GasCosts.CLAIM_NATIVE_TRANSFER : EVMSpvVaultContract.GasCosts.CLAIM_ERC20_TRANSFER;
            totalGas += transferFee;
            if (data==null || data.frontingFeeRate > 0n) totalGas += transferFee; //Also needs to pay out to fronter
            if (data==null || (data.callerFeeRate > 0n && !data.isRecipient(signer))) totalGas += transferFee; //Also needs to pay out to caller
        }
        if (data==null || (data.executionHash != null && data.executionHash !== ZeroHash)) totalGas += EVMSpvVaultContract.GasCosts.CLAIM_EXECUTION_SCHEDULE;

        return totalGas;
    }

    getFrontGas(signer: string, vault: EVMSpvVaultData, data?: EVMSpvWithdrawalData): number {
        let totalGas = EVMSpvVaultContract.GasCosts.FRONT_BASE;

        if (data==null || (data.rawAmounts[0] != null && data.rawAmounts[0] > 0n)) {
            totalGas += vault.token0.token.toLowerCase() === this.Chain.getNativeCurrencyAddress() ?
                EVMSpvVaultContract.GasCosts.FRONT_NATIVE_TRANSFER : EVMSpvVaultContract.GasCosts.FRONT_ERC20_TRANSFER;
        }
        if (data==null || (data.rawAmounts[1] != null && data.rawAmounts[1] > 0n)) {
            totalGas += vault.token1.token.toLowerCase() === this.Chain.getNativeCurrencyAddress() ?
                EVMSpvVaultContract.GasCosts.FRONT_NATIVE_TRANSFER : EVMSpvVaultContract.GasCosts.FRONT_ERC20_TRANSFER;
        }
        if (data==null || (data.executionHash != null && data.executionHash !== ZeroHash)) totalGas += EVMSpvVaultContract.GasCosts.FRONT_EXECUTION_SCHEDULE;

        return totalGas;
    }

    async getClaimFee(signer: string, vault: EVMSpvVaultData, withdrawalData: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint> {
        feeRate ??= await this.Chain.Fees.getFeeRate();
        return EVMFees.getGasFee(this.getClaimGas(signer, vault, withdrawalData), feeRate);
    }

    async getFrontFee(signer: string, vault?: EVMSpvVaultData, withdrawalData?: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint> {
        vault ??= EVMSpvVaultData.randomVault();
        feeRate ??= await this.Chain.Fees.getFeeRate();
        let totalFee = EVMFees.getGasFee(this.getFrontGas(signer, vault, withdrawalData), feeRate);
        if(withdrawalData==null || (withdrawalData.rawAmounts[0]!=null && withdrawalData.rawAmounts[0]>0n)) {
            if(vault.token0.token.toLowerCase()!==this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                totalFee += await this.Chain.Tokens.getApproveFee(feeRate);
            }
        }
        if(withdrawalData==null || (withdrawalData.rawAmounts[1]!=null && withdrawalData.rawAmounts[1]>0n)) {
            if(vault.token1.token.toLowerCase()!==this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                if(vault.token1.token.toLowerCase()!==vault.token0.token.toLowerCase() || withdrawalData==null || withdrawalData.rawAmounts[0]==null || withdrawalData.rawAmounts[0]===0n) {
                    totalFee += await this.Chain.Tokens.getApproveFee(feeRate);
                }
            }
        }
        return totalFee;
    }

}
