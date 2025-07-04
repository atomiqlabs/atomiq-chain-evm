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
import { EVMTx } from "../chain/modules/EVMTransactions";
import { EVMContractBase } from "../contract/EVMContractBase";
import { EVMSigner } from "../wallet/EVMSigner";
import {SpvVaultContractAbi} from "./SpvVaultContractAbi";
import {SpvVaultManager, SpvVaultParametersStructOutput} from "./SpvVaultContractTypechain";
import {EVMBtcRelay} from "../btcrelay/EVMBtcRelay";
import {getLogger} from "../../utils/Utils";
import {EVMChainInterface} from "../chain/EVMChainInterface";
import {AbiCoder, getAddress, hexlify, keccak256, TransactionRequest, ZeroHash} from "ethers";
import {EVMAddresses} from "../chain/modules/EVMAddresses";
import {EVMSpvVaultData, getVaultParamsCommitment} from "./EVMSpvVaultData";
import {EVMSpvWithdrawalData} from "./EVMSpvWithdrawalData";
import {EVMFees} from "../chain/modules/EVMFees";
import {EVMBtcStoredHeader} from "../btcrelay/headers/EVMBtcStoredHeader";
import {TypedEventLog} from "../typechain/common";

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
    private static readonly GasCosts = {
        DEPOSIT: 150_000,
        OPEN: 100_000,
        FRONT: 250_000,
        CLAIM: 250_000
    };

    readonly chainId: ChainId;

    readonly btcRelay: EVMBtcRelay<any>;
    readonly bitcoinRpc: BitcoinRpc<any>;
    readonly claimTimeout: number = 180;

    readonly logger = getLogger("EVMSpvVaultContract: ");

    readonly contractDeploymentHeight: number;

    constructor(
        chainInterface: EVMChainInterface<ChainId>,
        btcRelay: EVMBtcRelay<any>,
        bitcoinRpc: BitcoinRpc<any>,
        contractAddress: string,
        contractDeploymentHeight: number = 0
    ) {
        super(chainInterface, contractAddress, SpvVaultContractAbi);
        this.btcRelay = btcRelay;
        this.bitcoinRpc = bitcoinRpc;
        this.contractDeploymentHeight = contractDeploymentHeight;
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
        let value = 0n;
        if(vault.token0.token.toLowerCase()===this.Chain.getNativeCurrencyAddress().toLowerCase())
            value += rawAmounts[0] * vault.token0.multiplier;
        if(vault.token1.token.toLowerCase()===this.Chain.getNativeCurrencyAddress().toLowerCase())
            value += (rawAmounts[1] ?? 0n) * vault.token1.multiplier;

        const tx = await this.contract.deposit.populateTransaction(
            vault.owner, vault.vaultId, vault.getVaultParamsStruct(),
            rawAmounts[0], rawAmounts[1] ?? 0n, { value }
        );
        tx.from = signer;
        EVMFees.applyFeeRate(tx, EVMSpvVaultContract.GasCosts.DEPOSIT, feeRate);

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
        EVMFees.applyFeeRate(tx, EVMSpvVaultContract.GasCosts.FRONT, feeRate);

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
        EVMFees.applyFeeRate(tx, EVMSpvVaultContract.GasCosts.CLAIM, feeRate);

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
    async getVaultData(owner: string, vaultId: bigint): Promise<EVMSpvVaultData> {
        const vaultState = await this.contract.getVault(owner, vaultId);
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

        const vaultParams = foundEvent.args.params;
        if(vaultParams.btcRelayContract.toLowerCase()!==this.btcRelay.contractAddress.toLowerCase()) return null;

        return new EVMSpvVaultData(owner, vaultId, vaultState, vaultParams);
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
            }, undefined, this.contractDeploymentHeight
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

    async getWithdrawalState(btcTxId: string): Promise<SpvWithdrawalState> {
        const txHash = Buffer.from(btcTxId, "hex").reverse();
        let result: SpvWithdrawalState = {
            type: SpvWithdrawalStateType.NOT_FOUND
        };
        await this.Events.findInContractEvents(
            ["Fronted", "Claimed", "Closed"],
            [
                null,
                null,
                hexlify(txHash)
            ],
            async (event) => {
                switch(event.eventName) {
                    case "Fronted":
                        const frontedEvent = event as TypedEventLog<SpvVaultManager["filters"]["Fronted"]>;
                        const [ownerFront, vaultIdFront] = unpackOwnerAndVaultId(frontedEvent.args.ownerAndVaultId);
                        result = {
                            type: SpvWithdrawalStateType.FRONTED,
                            txId: event.transactionHash,
                            owner: ownerFront,
                            vaultId: vaultIdFront,
                            recipient: frontedEvent.args.recipient,
                            fronter: frontedEvent.args.caller
                        };
                        break;
                    case "Claimed":
                        const claimedEvent = event as TypedEventLog<SpvVaultManager["filters"]["Claimed"]>;
                        const [ownerClaim, vaultIdClaim] = unpackOwnerAndVaultId(claimedEvent.args.ownerAndVaultId);
                        result = {
                            type: SpvWithdrawalStateType.CLAIMED,
                            txId: event.transactionHash,
                            owner: ownerClaim,
                            vaultId: vaultIdClaim,
                            recipient: claimedEvent.args.recipient,
                            claimer: claimedEvent.args.caller,
                            fronter: claimedEvent.args.frontingAddress
                        };
                        break;
                    case "Closed":
                        const closedEvent = event as TypedEventLog<SpvVaultManager["filters"]["Closed"]>;
                        result = {
                            type: SpvWithdrawalStateType.CLOSED,
                            txId: event.transactionHash,
                            owner: closedEvent.args.owner,
                            vaultId: closedEvent.args.vaultId,
                            error: closedEvent.args.error
                        }
                        break;
                }
            }
        );
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
        for(let tokenAddress in requiredApprovals) {
            txs.push(await this.Chain.Tokens.Approve(signer, tokenAddress, requiredApprovals[tokenAddress], this.contractAddress, feeRate));
        }

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
        for(let tokenAddress in requiredApprovals) {
            txs.push(await this.Chain.Tokens.Approve(signer, tokenAddress, requiredApprovals[tokenAddress], this.contractAddress, feeRate));
        }
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

    async getClaimFee(signer: string, withdrawalData: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint> {
        feeRate ??= await this.Chain.Fees.getFeeRate();
        return EVMFees.getGasFee(EVMSpvVaultContract.GasCosts.CLAIM, feeRate);
    }

    async getFrontFee(signer: string, withdrawalData: EVMSpvWithdrawalData, feeRate?: string): Promise<bigint> {
        feeRate ??= await this.Chain.Fees.getFeeRate();
        return EVMFees.getGasFee(EVMSpvVaultContract.GasCosts.FRONT, feeRate);
    }

}
