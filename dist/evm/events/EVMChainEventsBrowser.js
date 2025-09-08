"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMChainEventsBrowser = void 0;
const base_1 = require("@atomiqlabs/base");
const EVMSwapData_1 = require("../swaps/EVMSwapData");
const ethers_1 = require("ethers");
const Utils_1 = require("../../utils/Utils");
const EVMSpvVaultContract_1 = require("../spv_swap/EVMSpvVaultContract");
const LOGS_SLIDING_WINDOW_LENGTH = 60;
const PROCESSED_EVENTS_BACKLOG = 1000;
/**
 * EVM on-chain event handler for front-end systems without access to fs, uses WS or long-polling to subscribe, might lose
 *  out on some events if the network is unreliable, front-end systems should take this into consideration and not
 *  rely purely on events
 */
class EVMChainEventsBrowser {
    constructor(chainInterface, evmSwapContract, evmSpvVaultContract, pollIntervalSeconds = 5) {
        this.eventsProcessing = {};
        this.processedEvents = [];
        this.processedEventsIndex = 0;
        this.listeners = [];
        this.logger = (0, Utils_1.getLogger)("EVMChainEventsBrowser: ");
        this.unconfirmedEventQueue = [];
        this.wsStarted = false;
        this.chainInterface = chainInterface;
        this.provider = chainInterface.provider;
        this.evmSwapContract = evmSwapContract;
        this.evmSpvVaultContract = evmSpvVaultContract;
        this.pollIntervalSeconds = pollIntervalSeconds;
        this.spvVaultContractLogFilter = {
            address: this.evmSpvVaultContract.contractAddress
        };
        this.swapContractLogFilter = {
            address: this.evmSwapContract.contractAddress
        };
    }
    addProcessedEvent(event) {
        this.processedEvents[this.processedEventsIndex] = event.transactionHash + ":" + event.index;
        this.processedEventsIndex += 1;
        if (this.processedEventsIndex >= PROCESSED_EVENTS_BACKLOG)
            this.processedEventsIndex = 0;
    }
    isEventProcessed(event) {
        return this.processedEvents.includes(event.transactionHash + ":" + event.index);
    }
    findInitSwapData(call, escrowHash, claimHandler) {
        if (call.to.toLowerCase() === this.evmSwapContract.contractAddress.toLowerCase()) {
            const result = this.evmSwapContract.parseCalldata(call.input);
            if (result != null && result.name === "initialize") {
                //Found, check correct escrow hash
                const [escrowData, signature, timeout, extraData] = result.args;
                const escrow = EVMSwapData_1.EVMSwapData.deserializeFromStruct(escrowData, claimHandler);
                if ("0x" + escrow.getEscrowHash() === escrowHash) {
                    const extraDataHex = (0, ethers_1.hexlify)(extraData);
                    if (extraDataHex.length > 2) {
                        escrow.setExtraData(extraDataHex.substring(2));
                    }
                    return escrow;
                }
            }
        }
        for (let _call of call.calls) {
            const found = this.findInitSwapData(_call, escrowHash, claimHandler);
            if (found != null)
                return found;
        }
        return null;
    }
    /**
     * Returns async getter for fetching on-demand initialize event swap data
     *
     * @param event
     * @param claimHandler
     * @private
     * @returns {() => Promise<EVMSwapData>} getter to be passed to InitializeEvent constructor
     */
    getSwapDataGetter(event, claimHandler) {
        return async () => {
            const trace = await this.chainInterface.Transactions.traceTransaction(event.transactionHash);
            if (trace == null)
                return null;
            return this.findInitSwapData(trace, event.args.escrowHash, claimHandler);
        };
    }
    parseInitializeEvent(event) {
        const escrowHash = event.args.escrowHash.substring(2);
        const claimHandlerHex = event.args.claimHandler;
        const claimHandler = this.evmSwapContract.claimHandlersByAddress[claimHandlerHex.toLowerCase()];
        if (claimHandler == null) {
            this.logger.warn("parseInitializeEvent(" + escrowHash + "): Unknown claim handler with claim: " + claimHandlerHex);
            return null;
        }
        const swapType = claimHandler.getType();
        this.logger.debug("InitializeEvent escrowHash: " + escrowHash);
        return new base_1.InitializeEvent(escrowHash, swapType, (0, Utils_1.onceAsync)(this.getSwapDataGetter(event, claimHandler)));
    }
    parseRefundEvent(event) {
        const escrowHash = event.args.escrowHash.substring(2);
        this.logger.debug("RefundEvent escrowHash: " + escrowHash);
        return new base_1.RefundEvent(escrowHash);
    }
    parseClaimEvent(event) {
        const escrowHash = event.args.escrowHash.substring(2);
        const claimHandlerHex = event.args.claimHandler;
        const claimHandler = this.evmSwapContract.claimHandlersByAddress[claimHandlerHex.toLowerCase()];
        if (claimHandler == null) {
            this.logger.warn("parseClaimEvent(" + escrowHash + "): Unknown claim handler with claim: " + claimHandlerHex);
            return null;
        }
        const witnessResult = event.args.witnessResult.substring(2);
        this.logger.debug("ClaimEvent witnessResult: " + witnessResult + " escrowHash: " + escrowHash);
        return new base_1.ClaimEvent(escrowHash, witnessResult);
    }
    parseSpvOpenEvent(event) {
        const owner = event.args.owner;
        const vaultId = event.args.vaultId;
        const btcTxId = Buffer.from(event.args.btcTxHash.substring(2), "hex").reverse().toString("hex");
        const vout = Number(event.args.vout);
        this.logger.debug("SpvOpenEvent owner: " + owner + " vaultId: " + vaultId + " utxo: " + btcTxId + ":" + vout);
        return new base_1.SpvVaultOpenEvent(owner, vaultId, btcTxId, vout);
    }
    parseSpvDepositEvent(event) {
        const [owner, vaultId] = (0, EVMSpvVaultContract_1.unpackOwnerAndVaultId)(event.args.ownerAndVaultId);
        const amounts = [event.args.amount0, event.args.amount1];
        const depositCount = Number(event.args.depositCount);
        this.logger.debug("SpvDepositEvent owner: " + owner + " vaultId: " + vaultId + " depositCount: " + depositCount + " amounts: ", amounts);
        return new base_1.SpvVaultDepositEvent(owner, vaultId, amounts, depositCount);
    }
    parseSpvFrontEvent(event) {
        const [owner, vaultId] = (0, EVMSpvVaultContract_1.unpackOwnerAndVaultId)(event.args.ownerAndVaultId);
        const btcTxId = Buffer.from(event.args.btcTxHash.substring(2), "hex").reverse().toString("hex");
        const recipient = event.args.recipient;
        const executionHash = event.args.executionHash;
        const amounts = [event.args.amount0, event.args.amount1];
        const frontingAddress = event.args.caller;
        this.logger.debug("SpvFrontEvent owner: " + owner + " vaultId: " + vaultId + " btcTxId: " + btcTxId +
            " recipient: " + recipient + " frontedBy: " + frontingAddress + " amounts: ", amounts);
        return new base_1.SpvVaultFrontEvent(owner, vaultId, btcTxId, recipient, executionHash, amounts, frontingAddress);
    }
    parseSpvClaimEvent(event) {
        const [owner, vaultId] = (0, EVMSpvVaultContract_1.unpackOwnerAndVaultId)(event.args.ownerAndVaultId);
        const btcTxId = Buffer.from(event.args.btcTxHash.substring(2), "hex").reverse().toString("hex");
        const recipient = event.args.recipient;
        const executionHash = event.args.executionHash;
        const amounts = [event.args.amount0, event.args.amount1];
        const caller = event.args.caller;
        const frontingAddress = event.args.frontingAddress;
        const withdrawCount = Number(event.args.withdrawCount);
        this.logger.debug("SpvClaimEvent owner: " + owner + " vaultId: " + vaultId + " btcTxId: " + btcTxId + " withdrawCount: " + withdrawCount +
            " recipient: " + recipient + " frontedBy: " + frontingAddress + " claimedBy: " + caller + " amounts: ", amounts);
        return new base_1.SpvVaultClaimEvent(owner, vaultId, btcTxId, recipient, executionHash, amounts, caller, frontingAddress, withdrawCount);
    }
    parseSpvCloseEvent(event) {
        const btcTxId = Buffer.from(event.args.btcTxHash.substring(2), "hex").reverse().toString("hex");
        return new base_1.SpvVaultCloseEvent(event.args.owner, event.args.vaultId, btcTxId, event.args.error);
    }
    /**
     * Processes event as received from the chain, parses it & calls event listeners
     *
     * @param events
     * @param currentBlock
     * @protected
     */
    async processEvents(events, currentBlock) {
        for (let event of events) {
            const eventIdentifier = event.transactionHash + ":" + event.index;
            if (this.isEventProcessed(event)) {
                this.logger.debug("processEvents(): skipping already processed event: " + eventIdentifier);
                continue;
            }
            let parsedEvent;
            switch (event.eventName) {
                case "Claim":
                    parsedEvent = this.parseClaimEvent(event);
                    break;
                case "Refund":
                    parsedEvent = this.parseRefundEvent(event);
                    break;
                case "Initialize":
                    parsedEvent = this.parseInitializeEvent(event);
                    break;
                case "Opened":
                    parsedEvent = this.parseSpvOpenEvent(event);
                    break;
                case "Deposited":
                    parsedEvent = this.parseSpvDepositEvent(event);
                    break;
                case "Fronted":
                    parsedEvent = this.parseSpvFrontEvent(event);
                    break;
                case "Claimed":
                    parsedEvent = this.parseSpvClaimEvent(event);
                    break;
                case "Closed":
                    parsedEvent = this.parseSpvCloseEvent(event);
                    break;
            }
            if (this.eventsProcessing[eventIdentifier] != null) {
                this.logger.debug("processEvents(): awaiting event that is currently processing: " + eventIdentifier);
                await this.eventsProcessing[eventIdentifier];
                continue;
            }
            const promise = (async () => {
                if (parsedEvent == null)
                    return;
                const timestamp = event.blockNumber === currentBlock?.number ? currentBlock.timestamp : await this.chainInterface.Blocks.getBlockTime(event.blockNumber);
                parsedEvent.meta = {
                    blockTime: timestamp,
                    txId: event.transactionHash,
                    timestamp //Maybe deprecated
                };
                for (let listener of this.listeners) {
                    await listener([parsedEvent]);
                }
                this.addProcessedEvent(event);
            })();
            this.eventsProcessing[eventIdentifier] = promise;
            try {
                await promise;
                delete this.eventsProcessing[eventIdentifier];
            }
            catch (e) {
                delete this.eventsProcessing[eventIdentifier];
                throw e;
            }
        }
    }
    async checkEventsEcrowManager(currentBlock, lastProcessedEvent, lastBlockNumber) {
        lastBlockNumber ?? (lastBlockNumber = currentBlock.number);
        if (currentBlock.number < lastBlockNumber) {
            this.logger.warn(`checkEventsEscrowManager(): Sanity check triggered - not processing events, currentBlock: ${currentBlock.number}, lastBlock: ${lastBlockNumber}`);
            return;
        }
        // this.logger.debug(`checkEvents(EscrowManager): Requesting logs: ${lastBlockNumber}...${currentBlock.number}`);
        let events = await this.evmSwapContract.Events.getContractBlockEvents(["Initialize", "Claim", "Refund"], [], lastBlockNumber, currentBlock.number);
        if (lastProcessedEvent != null) {
            const latestProcessedEventIndex = events.findIndex(val => val.blockHash === lastProcessedEvent.blockHash && val.index === lastProcessedEvent.logIndex);
            if (latestProcessedEventIndex !== -1) {
                events.splice(0, latestProcessedEventIndex + 1);
                this.logger.debug("checkEvents(EscrowManager): Splicing processed events, resulting size: " + events.length);
            }
        }
        if (events.length > 0) {
            await this.processEvents(events, currentBlock);
            const lastProcessed = events[events.length - 1];
            lastProcessedEvent = {
                blockHash: lastProcessed.blockHash,
                logIndex: lastProcessed.index
            };
            if (lastProcessed.blockNumber > lastBlockNumber)
                lastBlockNumber = lastProcessed.blockNumber;
        }
        else if (currentBlock.number - lastBlockNumber > LOGS_SLIDING_WINDOW_LENGTH) {
            lastProcessedEvent = null;
            lastBlockNumber = currentBlock.number - LOGS_SLIDING_WINDOW_LENGTH;
        }
        return [lastProcessedEvent, lastBlockNumber];
    }
    async checkEventsSpvVaults(currentBlock, lastProcessedEvent, lastBlockNumber) {
        lastBlockNumber ?? (lastBlockNumber = currentBlock.number);
        if (currentBlock.number < lastBlockNumber) {
            this.logger.warn(`checkEventsSpvVaults(): Sanity check triggered - not processing events, currentBlock: ${currentBlock.number}, lastBlock: ${lastBlockNumber}`);
            return;
        }
        // this.logger.debug(`checkEvents(SpvVaults): Requesting logs: ${lastBlockNumber}...${currentBlock.number}`);
        let events = await this.evmSpvVaultContract.Events.getContractBlockEvents(["Opened", "Deposited", "Closed", "Fronted", "Claimed"], [], lastBlockNumber, currentBlock.number);
        if (lastProcessedEvent != null) {
            const latestProcessedEventIndex = events.findIndex(val => val.blockHash === lastProcessedEvent.blockHash && val.index === lastProcessedEvent.logIndex);
            if (latestProcessedEventIndex !== -1) {
                events.splice(0, latestProcessedEventIndex + 1);
                this.logger.debug("checkEvents(SpvVaults): Splicing processed events, resulting size: " + events.length);
            }
        }
        if (events.length > 0) {
            await this.processEvents(events, currentBlock);
            const lastProcessed = events[events.length - 1];
            lastProcessedEvent = {
                blockHash: lastProcessed.blockHash,
                logIndex: lastProcessed.index
            };
            if (lastProcessed.blockNumber > lastBlockNumber)
                lastBlockNumber = lastProcessed.blockNumber;
        }
        else if (currentBlock.number - lastBlockNumber > LOGS_SLIDING_WINDOW_LENGTH) {
            lastProcessedEvent = null;
            lastBlockNumber = currentBlock.number - LOGS_SLIDING_WINDOW_LENGTH;
        }
        return [lastProcessedEvent, lastBlockNumber];
    }
    async checkEvents(lastState) {
        lastState ?? (lastState = []);
        const currentBlock = await this.provider.getBlock(this.chainInterface.config.safeBlockTag, false);
        const [lastEscrowEvent, lastEscrowHeight] = await this.checkEventsEcrowManager(currentBlock, lastState?.[0]?.lastEvent, lastState?.[0]?.lastBlockNumber);
        const [lastSpvVaultEvent, lastSpvVaultHeight] = await this.checkEventsSpvVaults(currentBlock, lastState?.[1]?.lastEvent, lastState?.[1]?.lastBlockNumber);
        lastState = [
            { lastBlockNumber: lastEscrowHeight, lastEvent: lastEscrowEvent },
            { lastBlockNumber: lastSpvVaultHeight, lastEvent: lastSpvVaultEvent }
        ];
        return lastState;
    }
    /**
     * Sets up event handlers listening for swap events over websocket
     *
     * @protected
     */
    async setupPoll(lastState, saveLatestProcessedBlockNumber) {
        this.stopped = false;
        let func;
        func = async () => {
            await this.checkEvents(lastState).then(newState => {
                lastState = newState;
                if (saveLatestProcessedBlockNumber != null)
                    return saveLatestProcessedBlockNumber(newState);
            }).catch(e => {
                this.logger.error("setupPoll(): Failed to fetch evm log: ", e);
            });
            if (this.stopped)
                return;
            this.timeout = setTimeout(func, this.pollIntervalSeconds * 1000);
        };
        await func();
    }
    //Websocket
    handleWsEvents(events) {
        if (this.chainInterface.config.safeBlockTag === "latest" || this.chainInterface.config.safeBlockTag === "pending") {
            return this.processEvents(events);
        }
        this.unconfirmedEventQueue.push(...events);
    }
    async setupWebsocket() {
        this.wsStarted = true;
        await this.provider.on(this.spvVaultContractLogFilter, this.spvVaultContractListener = (log) => {
            let events = this.evmSpvVaultContract.Events.toTypedEvents([log]);
            events = events.filter(val => !val.removed);
            this.handleWsEvents(events);
        });
        await this.provider.on(this.swapContractLogFilter, this.swapContractListener = (log) => {
            let events = this.evmSwapContract.Events.toTypedEvents([log]);
            events = events.filter(val => !val.removed && (val.eventName === "Initialize" || val.eventName === "Refund" || val.eventName === "Claim"));
            this.handleWsEvents(events);
        });
        const safeBlockTag = this.chainInterface.config.safeBlockTag;
        let processing = false;
        if (safeBlockTag !== "latest" && safeBlockTag !== "pending")
            await this.provider.on("block", this.blockListener = async (blockNumber) => {
                if (processing)
                    return;
                if (this.unconfirmedEventQueue.length === 0)
                    return;
                processing = true;
                try {
                    const latestSafeBlock = await this.provider.getBlock(this.chainInterface.config.safeBlockTag);
                    const events = [];
                    this.unconfirmedEventQueue = this.unconfirmedEventQueue.filter(event => {
                        if (event.blockNumber <= latestSafeBlock.number) {
                            events.push(event);
                            return false;
                        }
                        return true;
                    });
                    const blocks = {};
                    for (let event of events) {
                        const block = blocks[event.blockNumber] ?? (blocks[event.blockNumber] = await this.provider.getBlock(event.blockNumber));
                        if (block.hash === event.blockHash) {
                            //Valid event
                            await this.processEvents([event], block);
                        }
                        else {
                            //Block hash doesn't match
                        }
                    }
                }
                catch (e) {
                    this.logger.error(`on('block'): Error when processing new block ${blockNumber}:`, e);
                }
                processing = false;
            });
    }
    async init() {
        if (this.provider.websocket != null) {
            await this.setupWebsocket();
        }
        else {
            await this.setupPoll();
        }
        this.stopped = false;
        return Promise.resolve();
    }
    async stop() {
        this.stopped = true;
        if (this.timeout != null)
            clearTimeout(this.timeout);
        if (this.wsStarted) {
            await this.provider.off(this.spvVaultContractLogFilter, this.spvVaultContractListener);
            await this.provider.off(this.swapContractLogFilter, this.swapContractListener);
            await this.provider.off("block", this.blockListener);
            this.wsStarted = false;
        }
    }
    registerListener(cbk) {
        this.listeners.push(cbk);
    }
    unregisterListener(cbk) {
        const index = this.listeners.indexOf(cbk);
        if (index >= 0) {
            this.listeners.splice(index, 1);
            return true;
        }
        return false;
    }
}
exports.EVMChainEventsBrowser = EVMChainEventsBrowser;
