import {EVMSwapContract} from "../../evm/swaps/EVMSwapContract";
import {EVMSwapData} from "../../evm/swaps/EVMSwapData";
import {CitreaFees} from "./CitreaFees";

export class CitreaSwapContract extends EVMSwapContract<"CITREA"> {

    public static readonly StateDiffSize = {
        BASE_DIFF_SIZE: 35,
        REPUTATION_UPDATE_DIFF_SIZE: 25,
        LP_VAULT_UPDATE_DIFF_SIZE: 25,
        ERC_20_TRANSFER_DIFF_SIZE: 50,
        NATIVE_SELF_TRANSFER_DIFF_SIZE: 20,
        NATIVE_TRANSFER_DIFF_SIZE: 30
    };

    private calculateStateDiff(signer: string, tokenStateChanges: Set<string>): number {
        let stateDiffSize = 0;
        tokenStateChanges.forEach(val => {
            const [address, token] = val.split(":");
            if(token.toLowerCase()===this.Chain.getNativeCurrencyAddress().toLowerCase()) {
                stateDiffSize += address.toLowerCase()===signer?.toLowerCase() ? CitreaSwapContract.StateDiffSize.NATIVE_SELF_TRANSFER_DIFF_SIZE : CitreaSwapContract.StateDiffSize.NATIVE_TRANSFER_DIFF_SIZE;
            } else {
                stateDiffSize += CitreaSwapContract.StateDiffSize.ERC_20_TRANSFER_DIFF_SIZE;
            }
        });
        return stateDiffSize;
    }

    /**
     * Get the estimated solana fee of the commit transaction
     */
    async getCommitFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint> {
        feeRate ??= await this.Chain.Fees.getFeeRate();

        const tokenStateChanges: Set<string> = new Set();

        let diffSize = CitreaSwapContract.StateDiffSize.BASE_DIFF_SIZE;
        if(!swapData.isPayIn()) {
            diffSize += CitreaSwapContract.StateDiffSize.LP_VAULT_UPDATE_DIFF_SIZE;
        } else {
            tokenStateChanges.add(swapData.getOfferer().toLowerCase()+":"+swapData.getToken().toLowerCase());
        }
        if(swapData.getTotalDeposit()>0n) {
            tokenStateChanges.add(signer.toLowerCase()+":"+swapData.getDepositToken().toLowerCase());
        }
        diffSize += this.calculateStateDiff(signer, tokenStateChanges);

        const gasFee = await this.Init.getInitFee(swapData, feeRate);
        return gasFee + CitreaFees.getGasFee(0, feeRate, diffSize);
    }

    async getClaimFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint> {
        feeRate ??= await this.Chain.Fees.getFeeRate();

        const tokenStateChanges: Set<string> = new Set();

        let diffSize = CitreaSwapContract.StateDiffSize.BASE_DIFF_SIZE;
        if(swapData.reputation) diffSize += CitreaSwapContract.StateDiffSize.REPUTATION_UPDATE_DIFF_SIZE;
        if(!swapData.isPayOut()) {
            diffSize += CitreaSwapContract.StateDiffSize.LP_VAULT_UPDATE_DIFF_SIZE;
        } else {
            tokenStateChanges.add(swapData.getClaimer().toLowerCase()+":"+swapData.getToken().toLowerCase());
        }
        if(swapData.getClaimerBounty() > 0) {
            tokenStateChanges.add(signer.toLowerCase()+":"+swapData.getDepositToken().toLowerCase());
        }
        if(swapData.getSecurityDeposit() > swapData.getClaimerBounty()) {
            tokenStateChanges.add(swapData.getClaimer().toLowerCase()+":"+swapData.getDepositToken().toLowerCase());
        }
        diffSize += this.calculateStateDiff(signer, tokenStateChanges);

        const gasFee = await this.Claim.getClaimFee(swapData, feeRate);
        return gasFee + CitreaFees.getGasFee(0, feeRate, diffSize);
    }

    /**
     * Get the estimated solana transaction fee of the refund transaction
     */
    async getRefundFee(signer: string, swapData: EVMSwapData, feeRate?: string): Promise<bigint> {
        feeRate ??= await this.Chain.Fees.getFeeRate();

        const tokenStateChanges: Set<string> = new Set();

        let diffSize = CitreaSwapContract.StateDiffSize.BASE_DIFF_SIZE;
        if(swapData.reputation) diffSize += CitreaSwapContract.StateDiffSize.REPUTATION_UPDATE_DIFF_SIZE;
        if(!swapData.isPayIn()) {
            diffSize += CitreaSwapContract.StateDiffSize.LP_VAULT_UPDATE_DIFF_SIZE;
        } else {
            tokenStateChanges.add(swapData.getOfferer().toLowerCase()+":"+swapData.getToken().toLowerCase());
        }
        if(swapData.getSecurityDeposit() > 0) {
            tokenStateChanges.add(swapData.getOfferer().toLowerCase()+":"+swapData.getDepositToken().toLowerCase());
        }
        if(swapData.getClaimerBounty() > swapData.getSecurityDeposit()) {
            tokenStateChanges.add(swapData.getClaimer().toLowerCase()+":"+swapData.getDepositToken().toLowerCase());
        }
        diffSize += this.calculateStateDiff(signer, tokenStateChanges);

        const gasFee = await this.Refund.getRefundFee(swapData, feeRate);
        return gasFee + CitreaFees.getGasFee(0, feeRate, diffSize);
    }

}