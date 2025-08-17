import {ChainSwapType, RelaySynchronizer, SwapDataVerificationError} from "@atomiqlabs/base";
import {IClaimHandler} from "../handlers/claim/ClaimHandlers";
import {BitcoinOutputWitnessData} from "../handlers/claim/btc/BitcoinOutputClaimHandler";
import {BitcoinWitnessData} from "../handlers/claim/btc/IBitcoinClaimHandler";
import {Buffer} from "buffer";
import {EVMSwapModule} from "../EVMSwapModule";
import { EVMSwapData } from "../EVMSwapData";
import {TransactionRequest} from "ethers";
import {EVMFees} from "../../chain/modules/EVMFees";
import {EVMTx} from "../../chain/modules/EVMTransactions";
import {EVMBtcStoredHeader} from "../../btcrelay/headers/EVMBtcStoredHeader";

export class EVMSwapClaim extends EVMSwapModule {

    private static readonly GasCosts = {
        BASE: 30_000 + 21_000,
        ERC20_TRANSFER: 40_000,
        NATIVE_TRANSFER: 35_500,
        LP_VAULT_TRANSFER: 10_000,
        REPUTATION: 25_000
    };

    /**
     * Claim action which uses the provided witness for claiming the swap
     *
     * @param signer
     * @param swapData
     * @param witness
     * @param feeRate
     * @param claimHandlerGas
     * @private
     */
    private async Claim(
        signer: string,
        swapData: EVMSwapData,
        witness: Buffer,
        feeRate: string,
        claimHandlerGas?: number
    ): Promise<TransactionRequest> {
        //TODO: Claim with success action not supported yet!
        const tx = await this.swapContract.claim.populateTransaction(swapData.toEscrowStruct(), witness);
        tx.from = signer;
        EVMFees.applyFeeRate(tx, this.getClaimGas(swapData) + (claimHandlerGas ?? 0), feeRate);
        return tx;
    }

    /**
     * Creates transactions claiming the swap using a secret (for HTLC swaps)
     *
     * @param signer
     * @param swapData swap to claim
     * @param secret hex encoded secret pre-image to the HTLC hash
     * @param checkExpiry whether to check if the swap is already expired (trying to claim an expired swap with a secret
     *  is dangerous because we might end up revealing the secret to the counterparty without being able to claim the swap)
     * @param feeRate fee rate to use for the transaction
     */
    async txsClaimWithSecret(
        signer: string,
        swapData: EVMSwapData,
        secret: string,
        checkExpiry?: boolean,
        feeRate?: string
    ): Promise<EVMTx[]> {
        //We need to be sure that this transaction confirms in time, otherwise we reveal the secret to the counterparty
        // and won't claim the funds
        if(checkExpiry && await this.contract.isExpired(swapData.claimer.toString(), swapData)) {
            throw new SwapDataVerificationError("Not enough time to reliably pay the invoice");
        }

        const claimHandler: IClaimHandler<Buffer, string> = this.contract.claimHandlersByAddress[swapData.claimHandler.toLowerCase()];
        if(claimHandler==null) throw new SwapDataVerificationError("Unknown claim handler!");
        if(claimHandler.getType()!==ChainSwapType.HTLC) throw new SwapDataVerificationError("Invalid claim handler!");

        feeRate ??= await this.root.Fees.getFeeRate();

        const {initialTxns, witness} = await claimHandler.getWitness(signer, swapData, secret, feeRate);
        const tx = await this.Claim(signer, swapData, witness, feeRate, claimHandler.getGas(swapData));

        this.logger.debug("txsClaimWithSecret(): creating claim transaction, swap: "+swapData.getClaimHash()+" witness: ", witness.toString("hex"));

        return [...initialTxns, tx];
    }

    /**
     * Creates transaction claiming the swap using a confirmed transaction data (for BTC on-chain swaps)
     *
     * @param signer
     * @param swapData swap to claim
     * @param tx bitcoin transaction that satisfies the swap condition
     * @param requiredConfirmations
     * @param vout vout of the bitcoin transaction that satisfies the swap condition
     * @param commitedHeader commited header data from btc relay (fetched internally if null)
     * @param synchronizer optional synchronizer to use in case we need to sync up the btc relay ourselves
     * @param feeRate fee rate to be used for the transactions
     */
    async txsClaimWithTxData(
        signer: string,
        swapData: EVMSwapData,
        tx: { blockhash: string, confirmations: number, txid: string, hex: string, height: number },
        requiredConfirmations: number,
        vout: number,
        commitedHeader?: EVMBtcStoredHeader,
        synchronizer?: RelaySynchronizer<EVMBtcStoredHeader, EVMTx, any>,
        feeRate?: string
    ): Promise<EVMTx[] | null> {
        const claimHandler: IClaimHandler<any, BitcoinOutputWitnessData | BitcoinWitnessData> = this.contract.claimHandlersByAddress[swapData.claimHandler.toLowerCase()];
        if(claimHandler==null) throw new SwapDataVerificationError("Unknown claim handler!");
        if(
            claimHandler.getType()!==ChainSwapType.CHAIN_NONCED &&
            claimHandler.getType()!==ChainSwapType.CHAIN_TXID &&
            claimHandler.getType()!==ChainSwapType.CHAIN
        ) throw new SwapDataVerificationError("Invalid claim handler!");

        feeRate ??= await this.root.Fees.getFeeRate();

        const {initialTxns, witness} = await claimHandler.getWitness(signer, swapData, {
            tx,
            vout,
            requiredConfirmations,
            commitedHeader,
            btcRelay: this.contract.btcRelay,
            synchronizer,
        }, feeRate);
        const claimTx = await this.Claim(signer, swapData, witness, feeRate, claimHandler.getGas(swapData));

        return [...initialTxns, claimTx];
    }

    getClaimGas(swapData: EVMSwapData): number {
        let totalGas = EVMSwapClaim.GasCosts.BASE;
        if(swapData.reputation) totalGas += EVMSwapClaim.GasCosts.REPUTATION;
        if(swapData.isPayOut()) {
            if(swapData.isToken(this.root.getNativeCurrencyAddress())) {
                totalGas += EVMSwapClaim.GasCosts.NATIVE_TRANSFER;
            } else {
                totalGas += EVMSwapClaim.GasCosts.ERC20_TRANSFER;
            }
        } else {
            totalGas += EVMSwapClaim.GasCosts.LP_VAULT_TRANSFER;
        }
        if(swapData.getClaimerBounty() > 0n) {
            if(swapData.isDepositToken(this.root.getNativeCurrencyAddress())) {
                totalGas += EVMSwapClaim.GasCosts.NATIVE_TRANSFER;
            } else {
                totalGas += EVMSwapClaim.GasCosts.ERC20_TRANSFER;
            }
        }
        if(swapData.getSecurityDeposit() > swapData.getClaimerBounty()) {
            if(swapData.isDepositToken(this.root.getNativeCurrencyAddress())) {
                totalGas += EVMSwapClaim.GasCosts.NATIVE_TRANSFER;
            } else {
                totalGas += EVMSwapClaim.GasCosts.ERC20_TRANSFER;
            }
        }
        return totalGas;
    }

    /**
     * Get the estimated starknet transaction fee of the claim transaction
     */
    public async getClaimFee(swapData: EVMSwapData, feeRate?: string): Promise<bigint> {
        feeRate ??= await this.root.Fees.getFeeRate();

        //TODO: Claim with success action not supported yet!
        let gasRequired = this.getClaimGas(swapData);

        const claimHandler: IClaimHandler<any, any> = this.contract.claimHandlersByAddress[swapData.claimHandler.toLowerCase()];
        if(claimHandler!=null) gasRequired += claimHandler.getGas(swapData);

        return EVMFees.getGasFee(gasRequired, feeRate);
    }

}