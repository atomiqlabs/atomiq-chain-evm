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
const promise_cache_ts_1 = require("promise-cache-ts");
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
    return [(0, ethers_1.getAddress)(data.substring(0, 42)), BigInt("0x" + data.substring(42, 66))];
}
exports.unpackOwnerAndVaultId = unpackOwnerAndVaultId;
/**
 * @category Swaps
 */
class EVMSpvVaultContract extends EVMContractBase_1.EVMContractBase {
    constructor(chainInterface, btcRelay, bitcoinRpc, contractAddress, contractDeploymentHeight) {
        super(chainInterface, contractAddress, SpvVaultContractAbi_1.SpvVaultContractAbi, contractDeploymentHeight);
        this.claimTimeout = 180;
        this.logger = (0, Utils_1.getLogger)("EVMSpvVaultContract: ");
        this.vaultParamsCache = new promise_cache_ts_1.PromiseLruCache(5000);
        this.chainId = chainInterface.chainId;
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
        let totalGas = EVMSpvVaultContract.GasCosts.DEPOSIT_BASE;
        let value = 0n;
        if (vault.token0.token.toLowerCase() === this.Chain.getNativeCurrencyAddress().toLowerCase()) {
            value += rawAmounts[0] * vault.token0.multiplier;
        }
        else {
            if (rawAmounts[0] > 0n)
                totalGas += EVMSpvVaultContract.GasCosts.DEPOSIT_ERC20;
        }
        if (vault.token1.token.toLowerCase() === this.Chain.getNativeCurrencyAddress().toLowerCase()) {
            value += (rawAmounts[1] ?? 0n) * vault.token1.multiplier;
        }
        else {
            if (rawAmounts[1] != null && rawAmounts[1] > 0n && vault.token0.token.toLowerCase() !== vault.token1.token.toLowerCase())
                totalGas += EVMSpvVaultContract.GasCosts.DEPOSIT_ERC20;
        }
        const tx = await this.contract.deposit.populateTransaction(vault.owner, vault.vaultId, vault.getVaultParamsStruct(), rawAmounts[0], rawAmounts[1] ?? 0n, { value });
        tx.from = signer;
        EVMFees_1.EVMFees.applyFeeRate(tx, totalGas, feeRate);
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
        EVMFees_1.EVMFees.applyFeeRate(tx, this.getFrontGas(signer, vault, data), feeRate);
        return tx;
    }
    async Claim(signer, vault, data, blockheader, merkle, position, feeRate) {
        const tx = await this.contract.claim.populateTransaction(vault.owner, vault.vaultId, vault.getVaultParamsStruct(), "0x" + data.btcTx.hex, blockheader.serializeToStruct(), merkle, position);
        tx.from = signer;
        EVMFees_1.EVMFees.applyFeeRate(tx, this.getClaimGas(signer, vault, data), feeRate);
        return tx;
    }
    /**
     * @inheritDoc
     */
    async checkWithdrawalTx(tx) {
        const result = await this.contract.parseBitcoinTx(buffer_1.Buffer.from(tx.btcTx.hex, "hex"));
        if (result == null)
            throw new Error("Failed to parse transaction!");
    }
    /**
     * @inheritDoc
     */
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
    /**
     * @inheritDoc
     */
    async getFronterAddress(owner, vaultId, withdrawal) {
        const frontingAddress = await this.contract.getFronterById(owner, vaultId, "0x" + withdrawal.getFrontingId());
        if (frontingAddress === ethers_1.ZeroAddress)
            return null;
        return frontingAddress;
    }
    /**
     * @inheritDoc
     */
    async getFronterAddresses(withdrawals) {
        const result = {};
        let promises = [];
        //TODO: We can upgrade this to use multicall
        for (let { owner, vaultId, withdrawal } of withdrawals) {
            promises.push(this.getFronterAddress(owner, vaultId, withdrawal).then(val => {
                result[withdrawal.getTxId()] = val;
            }));
            if (promises.length >= this.Chain.config.maxParallelCalls) {
                await Promise.all(promises);
                promises = [];
            }
        }
        await Promise.all(promises);
        return result;
    }
    /**
     * @inheritDoc
     */
    async getVaultData(owner, vaultId) {
        const vaultState = await this.contract.getVault(owner, vaultId);
        if (vaultState.spvVaultParametersCommitment === ethers_1.ZeroHash)
            return null;
        const vaultParams = await this.vaultParamsCache.getOrComputeAsync(vaultState.spvVaultParametersCommitment, async () => {
            const blockheight = Number(vaultState.openBlockheight);
            const events = await this.Events.getContractBlockEvents(["Opened"], [
                "0x" + owner.substring(2).padStart(64, "0"),
                (0, ethers_1.hexlify)(base_1.BigIntBufferUtils.toBuffer(vaultId, "be", 32))
            ], blockheight);
            const foundEvent = events.find(event => (0, EVMSpvVaultData_1.getVaultParamsCommitment)(event.args.params) === vaultState.spvVaultParametersCommitment);
            if (foundEvent == null)
                throw new Error("Valid open event not found!");
            return foundEvent.args.params;
        });
        if (vaultParams.btcRelayContract.toLowerCase() !== this.btcRelay.contractAddress.toLowerCase())
            return null;
        return new EVMSpvVaultData_1.EVMSpvVaultData(owner, vaultId, vaultState, vaultParams);
    }
    /**
     * @inheritDoc
     */
    async getMultipleVaultData(vaults) {
        const result = {};
        let promises = [];
        //TODO: We can upgrade this to use multicall
        for (let { owner, vaultId } of vaults) {
            promises.push(this.getVaultData(owner, vaultId).then(val => {
                result[owner] ?? (result[owner] = {});
                result[owner][vaultId.toString(10)] = val;
            }));
            if (promises.length >= this.Chain.config.maxParallelCalls) {
                await Promise.all(promises);
                promises = [];
            }
        }
        await Promise.all(promises);
        return result;
    }
    /**
     * @inheritDoc
     */
    async getVaultLatestUtxo(owner, vaultId) {
        const vaultState = await this.contract.getVault(owner, vaultId);
        const utxo = (0, EVMSpvVaultData_1.getVaultUtxoFromState)(vaultState);
        if (utxo === "0000000000000000000000000000000000000000000000000000000000000000:0")
            return null;
        return utxo;
    }
    /**
     * @inheritDoc
     */
    async getVaultLatestUtxos(vaults) {
        const result = {};
        let promises = [];
        //TODO: We can upgrade this to use multicall
        for (let { owner, vaultId } of vaults) {
            promises.push(this.getVaultLatestUtxo(owner, vaultId).then(val => {
                result[owner] ?? (result[owner] = {});
                result[owner][vaultId.toString(10)] = val;
            }));
            if (promises.length >= this.Chain.config.maxParallelCalls) {
                await Promise.all(promises);
                promises = [];
            }
        }
        await Promise.all(promises);
        return result;
    }
    /**
     * @inheritDoc
     */
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
            return Promise.resolve(null);
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
    parseWithdrawalEvent(event) {
        switch (event.eventName) {
            case "Fronted":
                const frontedEvent = event;
                const [ownerFront, vaultIdFront] = unpackOwnerAndVaultId(frontedEvent.args.ownerAndVaultId);
                return {
                    type: base_1.SpvWithdrawalStateType.FRONTED,
                    txId: event.transactionHash,
                    owner: ownerFront,
                    vaultId: vaultIdFront,
                    recipient: frontedEvent.args.recipient,
                    fronter: frontedEvent.args.caller
                };
            case "Claimed":
                const claimedEvent = event;
                const [ownerClaim, vaultIdClaim] = unpackOwnerAndVaultId(claimedEvent.args.ownerAndVaultId);
                return {
                    type: base_1.SpvWithdrawalStateType.CLAIMED,
                    txId: event.transactionHash,
                    owner: ownerClaim,
                    vaultId: vaultIdClaim,
                    recipient: claimedEvent.args.recipient,
                    claimer: claimedEvent.args.caller,
                    fronter: claimedEvent.args.frontingAddress
                };
            case "Closed":
                const closedEvent = event;
                return {
                    type: base_1.SpvWithdrawalStateType.CLOSED,
                    txId: event.transactionHash,
                    owner: closedEvent.args.owner,
                    vaultId: closedEvent.args.vaultId,
                    error: closedEvent.args.error
                };
            default:
                return null;
        }
    }
    /**
     * @inheritDoc
     */
    async getWithdrawalState(withdrawalTx, scStartHeight) {
        const txHash = buffer_1.Buffer.from(withdrawalTx.getTxId(), "hex").reverse();
        const events = ["Fronted", "Claimed", "Closed"];
        const keys = [null, null, (0, ethers_1.hexlify)(txHash)];
        let result;
        if (scStartHeight == null) {
            result = await this.Events.findInContractEvents(events, keys, async (event) => {
                return this.parseWithdrawalEvent(event);
            });
        }
        else {
            result = await this.Events.findInContractEventsForward(events, keys, async (event) => {
                const result = this.parseWithdrawalEvent(event);
                if (result == null)
                    return null;
                if (result.type === base_1.SpvWithdrawalStateType.FRONTED) {
                    //Check if still fronted
                    const fronterAddress = await this.getFronterAddress(result.owner, result.vaultId, withdrawalTx);
                    //Not fronted now, there should be a claim/close event after the front event, continue
                    if (fronterAddress == null)
                        return null;
                }
                return result;
            }, scStartHeight);
        }
        result ?? (result = {
            type: base_1.SpvWithdrawalStateType.NOT_FOUND
        });
        return result;
    }
    /**
     * @inheritDoc
     */
    async getWithdrawalStates(withdrawalTxs) {
        var _a;
        const result = {};
        const events = ["Fronted", "Claimed", "Closed"];
        for (let i = 0; i < withdrawalTxs.length; i += this.Chain.config.maxLogTopics) {
            const checkWithdrawalTxs = withdrawalTxs.slice(i, i + this.Chain.config.maxLogTopics);
            const checkWithdrawalTxsMap = new Map(checkWithdrawalTxs.map(val => [val.withdrawal.getTxId(), val.withdrawal]));
            let scStartHeight = null;
            for (let val of checkWithdrawalTxs) {
                if (val.scStartBlockheight == null) {
                    scStartHeight = null;
                    break;
                }
                scStartHeight = Math.min(scStartHeight ?? Infinity, val.scStartBlockheight);
            }
            const keys = [null, null, checkWithdrawalTxs.map(withdrawal => (0, ethers_1.hexlify)(buffer_1.Buffer.from(withdrawal.withdrawal.getTxId(), "hex").reverse()))];
            if (scStartHeight == null) {
                await this.Events.findInContractEvents(events, keys, async (event) => {
                    const _event = event;
                    const btcTxId = buffer_1.Buffer.from(_event.args.btcTxHash.substring(2), "hex").reverse().toString("hex");
                    if (!checkWithdrawalTxsMap.has(btcTxId)) {
                        this.logger.warn(`getWithdrawalStates(): findInContractEvents-callback: loaded event for ${btcTxId}, but transaction not found in input params!`);
                        return null;
                    }
                    const eventResult = this.parseWithdrawalEvent(event);
                    if (eventResult == null)
                        return null;
                    checkWithdrawalTxsMap.delete(btcTxId);
                    result[btcTxId] = eventResult;
                    if (checkWithdrawalTxsMap.size === 0)
                        return true; //All processed
                });
            }
            else {
                await this.Events.findInContractEventsForward(events, keys, async (event) => {
                    const _event = event;
                    const btcTxId = buffer_1.Buffer.from(_event.args.btcTxHash.substring(2), "hex").reverse().toString("hex");
                    const withdrawalTx = checkWithdrawalTxsMap.get(btcTxId);
                    if (withdrawalTx == null) {
                        this.logger.warn(`getWithdrawalStates(): findInContractEvents-callback: loaded event for ${btcTxId}, but transaction not found in input params!`);
                        return;
                    }
                    const eventResult = this.parseWithdrawalEvent(event);
                    if (eventResult == null)
                        return;
                    if (eventResult.type === base_1.SpvWithdrawalStateType.FRONTED) {
                        //Check if still fronted
                        const fronterAddress = await this.getFronterAddress(eventResult.owner, eventResult.vaultId, withdrawalTx);
                        //Not fronted now, so there should be a claim/close event after the front event, continue
                        if (fronterAddress == null)
                            return;
                        //Fronted still, so this should be the latest current state
                    }
                    checkWithdrawalTxsMap.delete(btcTxId);
                    result[btcTxId] = eventResult;
                    if (checkWithdrawalTxsMap.size === 0)
                        return true; //All processed
                }, scStartHeight);
            }
        }
        for (let val of withdrawalTxs) {
            result[_a = val.withdrawal.getTxId()] ?? (result[_a] = {
                type: base_1.SpvWithdrawalStateType.NOT_FOUND
            });
        }
        return result;
    }
    /**
     * @inheritDoc
     */
    getWithdrawalData(btcTx) {
        return Promise.resolve(new EVMSpvWithdrawalData_1.EVMSpvWithdrawalData(btcTx));
    }
    //OP_RETURN data encoding/decoding
    /**
     * @inheritDoc
     */
    fromOpReturnData(data) {
        return EVMSpvVaultContract.fromOpReturnData(data);
    }
    static fromOpReturnData(data) {
        let rawAmount0 = 0n;
        let rawAmount1 = 0n;
        let executionHash;
        if (data.length === 28) {
            rawAmount0 = data.readBigInt64BE(20).valueOf();
        }
        else if (data.length === 36) {
            rawAmount0 = data.readBigInt64BE(20).valueOf();
            rawAmount1 = data.readBigInt64BE(28).valueOf();
        }
        else if (data.length === 60) {
            rawAmount0 = data.readBigInt64BE(20).valueOf();
            executionHash = data.slice(28, 60).toString("hex");
        }
        else if (data.length === 68) {
            rawAmount0 = data.readBigInt64BE(20).valueOf();
            rawAmount1 = data.readBigInt64BE(28).valueOf();
            executionHash = data.slice(36, 68).toString("hex");
        }
        else {
            throw new Error("Invalid OP_RETURN data length!");
        }
        const recipient = "0x" + data.slice(0, 20).toString("hex");
        if (!EVMAddresses_1.EVMAddresses.isValidAddress(recipient))
            throw new Error("Invalid recipient specified");
        return { executionHash, rawAmounts: [rawAmount0, rawAmount1], recipient: (0, ethers_1.getAddress)(recipient) };
    }
    /**
     * @inheritDoc
     */
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
            amount0Buffer,
            amount1Buffer,
            executionHashBuffer
        ]);
    }
    //Actions
    /**
     * @inheritDoc
     */
    async claim(signer, vault, txs, synchronizer, initAta, txOptions) {
        const result = await this.txsClaim(signer.getAddress(), vault, txs, synchronizer, initAta, txOptions?.feeRate);
        const [signature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return signature;
    }
    /**
     * @inheritDoc
     */
    async deposit(signer, vault, rawAmounts, txOptions) {
        const result = await this.txsDeposit(signer.getAddress(), vault, rawAmounts, txOptions?.feeRate);
        const txHashes = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return txHashes[txHashes.length - 1];
    }
    /**
     * @inheritDoc
     */
    async frontLiquidity(signer, vault, realWithdrawalTx, withdrawSequence, txOptions) {
        const result = await this.txsFrontLiquidity(signer.getAddress(), vault, realWithdrawalTx, withdrawSequence, txOptions?.feeRate);
        const txHashes = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return txHashes[txHashes.length - 1];
    }
    /**
     * @inheritDoc
     */
    async open(signer, vault, txOptions) {
        const result = await this.txsOpen(signer.getAddress(), vault, txOptions?.feeRate);
        const [signature] = await this.Chain.sendAndConfirm(signer, result, txOptions?.waitForConfirmation, txOptions?.abortSignal);
        return signature;
    }
    //Transactions
    /**
     * @inheritDoc
     */
    async txsClaim(signer, vault, txs, synchronizer, initAta, feeRate) {
        if (!vault.isOpened())
            throw new Error("Cannot claim from a closed vault!");
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        const txsWithMerkleProofs = [];
        for (let tx of txs) {
            if (tx.tx.btcTx.blockhash == null)
                throw new Error(`Transaction ${tx.tx.btcTx.txid} doesn't have any blockhash, unconfirmed?`);
            const merkleProof = await this.bitcoinRpc.getMerkleProof(tx.tx.btcTx.txid, tx.tx.btcTx.blockhash);
            if (merkleProof == null)
                throw new Error(`Failed to get merkle proof for tx: ${tx.tx.btcTx.txid}!`);
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
    /**
     * @inheritDoc
     */
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
        const requiredApprovalTxns = await Promise.all(Object.keys(requiredApprovals).map(token => this.Chain.Tokens.checkAndGetApproveTx(signer, token, requiredApprovals[token], this.contractAddress, feeRate)));
        requiredApprovalTxns.forEach(tx => tx != null && txs.push(tx));
        txs.push(await this.Deposit(signer, vault, rawAmounts, feeRate));
        this.logger.debug("txsDeposit(): deposit TX created," +
            " token0: " + vault.token0.token + " rawAmount0: " + rawAmounts[0].toString(10) + " amount0: " + realAmount0.toString(10) +
            " token1: " + vault.token1.token + " rawAmount1: " + (rawAmounts[1] ?? 0n).toString(10) + " amount1: " + realAmount1.toString(10));
        return txs;
    }
    /**
     * @inheritDoc
     */
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
        const requiredApprovalTxns = await Promise.all(Object.keys(requiredApprovals).map(token => this.Chain.Tokens.checkAndGetApproveTx(signer, token, requiredApprovals[token], this.contractAddress, feeRate)));
        requiredApprovalTxns.forEach(tx => tx != null && txs.push(tx));
        txs.push(await this.Front(signer, vault, realWithdrawalTx, withdrawSequence, feeRate));
        this.logger.debug("txsFrontLiquidity(): front TX created," +
            " token0: " + vault.token0.token + " rawAmount0: " + rawAmounts[0].toString(10) + " amount0: " + realAmount0.toString(10) +
            " token1: " + vault.token1.token + " rawAmount1: " + (rawAmounts[1] ?? 0n).toString(10) + " amount1: " + realAmount1.toString(10));
        return txs;
    }
    /**
     * @inheritDoc
     */
    async txsOpen(signer, vault, feeRate) {
        if (vault.isOpened())
            throw new Error("Cannot open an already opened vault!");
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        const tx = await this.Open(signer, vault, feeRate);
        this.logger.debug("txsOpen(): open TX created, owner: " + vault.getOwner() +
            " vaultId: " + vault.getVaultId().toString(10));
        return [tx];
    }
    getClaimGas(signer, vault, data) {
        let totalGas = EVMSpvVaultContract.GasCosts.CLAIM_BASE;
        if (data == null || (data.rawAmounts[0] != null && data.rawAmounts[0] > 0n)) {
            const transferFee = vault == null || vault.token0.token.toLowerCase() === this.Chain.getNativeCurrencyAddress() ?
                EVMSpvVaultContract.GasCosts.CLAIM_NATIVE_TRANSFER : EVMSpvVaultContract.GasCosts.CLAIM_ERC20_TRANSFER;
            totalGas += transferFee;
            if (data == null || data.frontingFeeRate > 0n)
                totalGas += transferFee; //Also needs to pay out to fronter
            if (data == null || (data.callerFeeRate > 0n && !data.isRecipient(signer)))
                totalGas += transferFee; //Also needs to pay out to caller
        }
        if (data == null || (data.rawAmounts[1] != null && data.rawAmounts[1] > 0n)) {
            const transferFee = vault == null || vault.token1.token.toLowerCase() === this.Chain.getNativeCurrencyAddress() ?
                EVMSpvVaultContract.GasCosts.CLAIM_NATIVE_TRANSFER : EVMSpvVaultContract.GasCosts.CLAIM_ERC20_TRANSFER;
            totalGas += transferFee;
            if (data == null || data.frontingFeeRate > 0n)
                totalGas += transferFee; //Also needs to pay out to fronter
            if (data == null || (data.callerFeeRate > 0n && !data.isRecipient(signer)))
                totalGas += transferFee; //Also needs to pay out to caller
        }
        if (data == null || (data.executionHash != null && data.executionHash !== ethers_1.ZeroHash))
            totalGas += EVMSpvVaultContract.GasCosts.CLAIM_EXECUTION_SCHEDULE;
        return totalGas;
    }
    getFrontGas(signer, vault, data) {
        let totalGas = EVMSpvVaultContract.GasCosts.FRONT_BASE;
        if (data == null || (data.rawAmounts[0] != null && data.rawAmounts[0] > 0n)) {
            totalGas += vault == null || vault.token0.token.toLowerCase() === this.Chain.getNativeCurrencyAddress() ?
                EVMSpvVaultContract.GasCosts.FRONT_NATIVE_TRANSFER : EVMSpvVaultContract.GasCosts.FRONT_ERC20_TRANSFER;
        }
        if (data == null || (data.rawAmounts[1] != null && data.rawAmounts[1] > 0n)) {
            totalGas += vault == null || vault.token1.token.toLowerCase() === this.Chain.getNativeCurrencyAddress() ?
                EVMSpvVaultContract.GasCosts.FRONT_NATIVE_TRANSFER : EVMSpvVaultContract.GasCosts.FRONT_ERC20_TRANSFER;
        }
        if (data == null || (data.executionHash != null && data.executionHash !== ethers_1.ZeroHash))
            totalGas += EVMSpvVaultContract.GasCosts.FRONT_EXECUTION_SCHEDULE;
        return totalGas;
    }
    /**
     * @inheritDoc
     */
    async getClaimFee(signer, vault, withdrawalData, feeRate) {
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        return EVMFees_1.EVMFees.getGasFee(this.getClaimGas(signer, vault, withdrawalData), feeRate);
    }
    /**
     * @inheritDoc
     */
    async getFrontFee(signer, vault, withdrawalData, feeRate) {
        vault ?? (vault = EVMSpvVaultData_1.EVMSpvVaultData.randomVault());
        feeRate ?? (feeRate = await this.Chain.Fees.getFeeRate());
        let totalFee = EVMFees_1.EVMFees.getGasFee(this.getFrontGas(signer, vault, withdrawalData), feeRate);
        if (withdrawalData == null || (withdrawalData.rawAmounts[0] != null && withdrawalData.rawAmounts[0] > 0n)) {
            if (vault.token0.token.toLowerCase() !== this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                totalFee += await this.Chain.Tokens.getApproveFee(feeRate);
            }
        }
        if (withdrawalData == null || (withdrawalData.rawAmounts[1] != null && withdrawalData.rawAmounts[1] > 0n)) {
            if (vault.token1.token.toLowerCase() !== this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                if (vault.token1.token.toLowerCase() !== vault.token0.token.toLowerCase() || withdrawalData == null || withdrawalData.rawAmounts[0] == null || withdrawalData.rawAmounts[0] === 0n) {
                    totalFee += await this.Chain.Tokens.getApproveFee(feeRate);
                }
            }
        }
        return totalFee;
    }
}
exports.EVMSpvVaultContract = EVMSpvVaultContract;
EVMSpvVaultContract.GasCosts = {
    DEPOSIT_BASE: 15000 + 21000,
    DEPOSIT_ERC20: 40000,
    OPEN: 80000 + 21000,
    CLAIM_BASE: 85000 + 21000,
    CLAIM_NATIVE_TRANSFER: 85000,
    CLAIM_ERC20_TRANSFER: 40000,
    CLAIM_EXECUTION_SCHEDULE: 30000,
    FRONT_BASE: 75000 + 21000,
    FRONT_NATIVE_TRANSFER: 85000,
    FRONT_ERC20_TRANSFER: 40000,
    FRONT_EXECUTION_SCHEDULE: 30000
};
