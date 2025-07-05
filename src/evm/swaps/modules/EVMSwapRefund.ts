import {SignatureVerificationError, SwapDataVerificationError} from "@atomiqlabs/base";
import {tryWithRetries} from "../../../utils/Utils";
import {IHandler} from "../handlers/IHandler";
import {EVMSwapModule} from "../EVMSwapModule";
import {Buffer} from "buffer";
import {EVMSwapData} from "../EVMSwapData";
import {TransactionRequest} from "ethers";
import {EVMFees} from "../../chain/modules/EVMFees";
import {EVMSigner} from "../../wallet/EVMSigner";
import {EVMTx} from "../../chain/modules/EVMTransactions";

const Refund = [
    { name: "swapHash", type: "bytes32" },
    { name: "timeout", type: "uint256" }
];

export class EVMSwapRefund extends EVMSwapModule {

    private static readonly GasCosts = {
        BASE: 35_000 + 21_000,
        ERC20_TRANSFER: 40_000,
        NATIVE_TRANSFER: 7500,
        LP_VAULT_TRANSFER: 10_000,
        REPUTATION: 25_000
    };

    /**
     * Action for generic Refund instruction
     *
     * @param signer
     * @param swapData
     * @param witness
     * @param feeRate
     * @param handlerGas
     * @private
     */
    private async Refund(
        signer: string,
        swapData: EVMSwapData,
        witness: Buffer,
        feeRate: string,
        handlerGas?: number
    ): Promise<TransactionRequest> {
        const tx = await this.swapContract.refund.populateTransaction(swapData.toEscrowStruct(), witness);
        tx.from = signer;
        EVMFees.applyFeeRate(tx, this.getRefundGas(swapData) + (handlerGas ?? 0), feeRate)
        return tx;
    }

    /**
     * Action for cooperative refunding with signature
     *
     * @param sender
     * @param swapData
     * @param timeout
     * @param signature
     * @param feeRate
     * @private
     */
    private async RefundWithSignature(
        sender: string,
        swapData: EVMSwapData,
        timeout: string,
        signature: string,
        feeRate: string
    ): Promise<TransactionRequest> {
        const tx = await this.swapContract.cooperativeRefund.populateTransaction(swapData.toEscrowStruct(), signature, BigInt(timeout));
        tx.from = sender;
        EVMFees.applyFeeRate(tx, this.getRefundGas(swapData), feeRate)
        return tx;
    }

    public async signSwapRefund(
        signer: EVMSigner,
        swapData: EVMSwapData,
        authorizationTimeout: number
    ): Promise<{ prefix: string; timeout: string; signature: string }> {
        const authPrefix = "refund";
        const authTimeout = Math.floor(Date.now()/1000)+authorizationTimeout;

        const signature = await this.root.Signatures.signTypedMessage(this.contract.contractAddress, signer, Refund, "Refund", {
            "swapHash": "0x"+swapData.getEscrowHash(),
            "timeout": BigInt(authTimeout)
        });

        return {
            prefix: authPrefix,
            timeout: authTimeout.toString(10),
            signature: signature
        };
    }

    public async isSignatureValid(
        swapData: EVMSwapData,
        timeout: string,
        prefix: string,
        signature: string
    ): Promise<null> {
        if(prefix!=="refund") throw new SignatureVerificationError("Invalid prefix");

        const expiryTimestamp = BigInt(timeout);
        const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

        const isExpired = (expiryTimestamp - currentTimestamp) < BigInt(this.contract.authGracePeriod);
        if(isExpired) throw new SignatureVerificationError("Authorization expired!");

        const valid = await this.root.Signatures.isValidSignature(this.contract.contractAddress, signature, swapData.claimer, Refund, "Refund", {
            "swapHash": "0x"+swapData.getEscrowHash(),
            "timeout": BigInt(expiryTimestamp)
        });

        if(!valid) {
            throw new SignatureVerificationError("Invalid signature!");
        }

        return null;
    }

    /**
     * Creates transactions required for refunding timed out swap
     *
     * @param signer
     * @param swapData swap data to refund
     * @param check whether to check if swap is already expired and refundable
     * @param feeRate fee rate to be used for the transactions
     * @param witnessData
     */
    public async txsRefund<T>(
        signer: string,
        swapData: EVMSwapData,
        check?: boolean,
        feeRate?: string,
        witnessData?: T
    ): Promise<EVMTx[]> {
        const refundHandler: IHandler<any, T> = this.contract.refundHandlersByAddress[swapData.refundHandler.toLowerCase()];
        if(refundHandler==null) throw new Error("Invalid refund handler");

        if(check && !await tryWithRetries(() => this.contract.isRequestRefundable(swapData.offerer.toString(), swapData), this.retryPolicy)) {
            throw new SwapDataVerificationError("Not refundable yet!");
        }

        feeRate ??= await this.root.Fees.getFeeRate();

        const {initialTxns, witness} = await refundHandler.getWitness(signer, swapData, witnessData, feeRate);

        const tx = await this.Refund(signer, swapData, witness, feeRate, refundHandler.getGas(swapData));

        this.logger.debug("txsRefund(): creating refund transaction, swap: "+swapData.getClaimHash());

        return [...initialTxns, tx];
    }

    /**
     * Creates transactions required for refunding the swap with authorization signature, also unwraps WSOL to SOL
     *
     * @param signer
     * @param swapData swap data to refund
     * @param timeout signature timeout
     * @param prefix signature prefix of the counterparty
     * @param signature signature of the counterparty
     * @param check whether to check if swap is committed before attempting refund
     * @param feeRate fee rate to be used for the transactions
     */
    public async txsRefundWithAuthorization(
        signer: string,
        swapData: EVMSwapData,
        timeout: string,
        prefix: string,
        signature: string,
        check?: boolean,
        feeRate?: string
    ): Promise<EVMTx[]> {
        if(check && !await tryWithRetries(() => this.contract.isCommited(swapData), this.retryPolicy)) {
            throw new SwapDataVerificationError("Not correctly committed");
        }
        await tryWithRetries(
            () => this.isSignatureValid(swapData, timeout, prefix, signature),
            this.retryPolicy,
            (e) => e instanceof SignatureVerificationError
        );

        feeRate ??= await this.root.Fees.getFeeRate();

        const tx = await this.RefundWithSignature(signer, swapData, timeout, signature, feeRate);

        this.logger.debug("txsRefundWithAuthorization(): creating refund transaction, swap: "+swapData.getClaimHash()+
            " auth expiry: "+timeout+" signature: "+signature);

        return [tx];
    }

    getRefundGas(swapData: EVMSwapData): number {
        let totalGas = EVMSwapRefund.GasCosts.BASE;
        if(swapData.reputation) totalGas += EVMSwapRefund.GasCosts.REPUTATION;
        if(swapData.isPayIn()) {
            if(swapData.isToken(this.root.getNativeCurrencyAddress())) {
                totalGas += EVMSwapRefund.GasCosts.NATIVE_TRANSFER;
            } else {
                totalGas += EVMSwapRefund.GasCosts.ERC20_TRANSFER;
            }
        } else {
            totalGas += EVMSwapRefund.GasCosts.LP_VAULT_TRANSFER;
        }
        if(swapData.getSecurityDeposit() > 0n) {
            if(swapData.isDepositToken(this.root.getNativeCurrencyAddress())) {
                totalGas += EVMSwapRefund.GasCosts.NATIVE_TRANSFER;
            } else {
                totalGas += EVMSwapRefund.GasCosts.ERC20_TRANSFER;
            }
        }
        if(swapData.getClaimerBounty() > swapData.getSecurityDeposit()) {
            if(swapData.isDepositToken(this.root.getNativeCurrencyAddress())) {
                totalGas += EVMSwapRefund.GasCosts.NATIVE_TRANSFER;
            } else {
                totalGas += EVMSwapRefund.GasCosts.ERC20_TRANSFER;
            }
        }
        return totalGas;
    }

    /**
     * Get the estimated transaction fee of the refund transaction
     */
    async getRefundFee(swapData: EVMSwapData, feeRate?: string): Promise<bigint> {
        feeRate ??= await this.root.Fees.getFeeRate();
        return EVMFees.getGasFee(this.getRefundGas(swapData), feeRate);
    }

}
