import { IntermediaryReputationType } from "@atomiqlabs/base";
import { EVMSwapModule } from "../EVMSwapModule";
import {TransactionRequest} from "ethers";
import {EVMFees} from "../../chain/modules/EVMFees";
import {EVMTx} from "../../chain/modules/EVMTransactions";

export class EVMLpVault extends EVMSwapModule {

    private static readonly GasCosts = {
        WITHDRAW: 100_000,
        DEPOSIT: 100_000
    };

    /**
     * Action for withdrawing funds from the LP vault
     *
     * @param signer
     * @param token
     * @param amount
     * @param feeRate
     * @private
     */
    private async Withdraw(signer: string, token: string, amount: bigint, feeRate: string): Promise<TransactionRequest> {
        const tx = await this.swapContract.withdraw.populateTransaction(token, amount, signer);
        tx.from = signer;
        tx.gasLimit = BigInt(EVMLpVault.GasCosts.WITHDRAW);
        EVMFees.applyFeeRate(tx, EVMLpVault.GasCosts.WITHDRAW, feeRate);
        return tx;
    }

    /**
     * Action for depositing funds to the LP vault
     *
     * @param signer
     * @param token
     * @param amount
     * @param feeRate
     * @private
     */
    private async Deposit(signer: string, token: string, amount: bigint, feeRate: string): Promise<TransactionRequest> {
        const tx = await this.swapContract.deposit.populateTransaction(token, amount, {
            value: token.toLowerCase()===this.root.getNativeCurrencyAddress().toLowerCase() ? amount : 0n
        });
        tx.from = signer;
        EVMFees.applyFeeRate(tx, EVMLpVault.GasCosts.DEPOSIT, feeRate);
        return tx;
    }

    /**
     * Returns intermediary's reputation & vault balance for a specific token
     *
     * @param address
     * @param token
     */
    public async getIntermediaryData(address: string, token: string): Promise<{
        balance: bigint,
        reputation: IntermediaryReputationType
    }> {
        const [balance, reputation] = await Promise.all([
            this.getIntermediaryBalance(address, token),
            this.getIntermediaryReputation(address, token)
        ]);

        return {balance, reputation};
    }

    /**
     * Returns intermediary's reputation for a specific token
     *
     * @param address
     * @param token
     */
    public async getIntermediaryReputation(address: string, token: string): Promise<IntermediaryReputationType> {
        const filter = Object.keys(this.contract.claimHandlersByAddress).map(claimHandler => ({owner: address, token, claimHandler}));
        const resp = await this.swapContract.getReputation(filter);
        if(resp.length!==filter.length) throw new Error("getIntermediaryReputation(): Invalid response length");

        const result: any = {};
        Object.keys(this.contract.claimHandlersByAddress).forEach((address, index) => {
            const handler = this.contract.claimHandlersByAddress[address.toLowerCase()];
            const handlerResp = resp[index];
            result[handler.getType()] = {
                successVolume: handlerResp[0].amount,
                successCount: handlerResp[0].count,
                coopCloseVolume: handlerResp[1].amount,
                coopCloseCount: handlerResp[1].count,
                failVolume: handlerResp[2].amount,
                failCount: handlerResp[2].count,
            };
        });
        return result as any;
    }

    /**
     * Returns the balance of the token an intermediary has in his LP vault
     *
     * @param address
     * @param token
     */
    public async getIntermediaryBalance(address: string, token: string): Promise<bigint> {
        const [balance] = await this.swapContract.getBalance([{owner: address, token}]);

        this.logger.debug("getIntermediaryBalance(): token LP balance fetched, token: "+token.toString()+
            " address: "+address+" amount: "+(balance==null ? "null" : balance.toString()));

        return balance;
    }

    /**
     * Creates transactions for withdrawing funds from the LP vault, creates ATA if it doesn't exist and unwraps
     *  WSOL to SOL if required
     *
     * @param signer
     * @param token
     * @param amount
     * @param feeRate
     */
    public async txsWithdraw(signer: string, token: string, amount: bigint, feeRate?: string): Promise<EVMTx[]> {
        feeRate ??= await this.root.Fees.getFeeRate();
        const withdrawTx = await this.Withdraw(signer, token, amount, feeRate);

        this.logger.debug("txsWithdraw(): withdraw TX created, token: "+token.toString()+
            " amount: "+amount.toString(10));

        return [withdrawTx];
    }

    /**
     * Creates transaction for depositing funds into the LP vault, wraps SOL to WSOL if required
     *
     * @param signer
     * @param token
     * @param amount
     * @param feeRate
     */
    public async txsDeposit(signer: string, token: string, amount: bigint, feeRate?: string): Promise<EVMTx[]> {
        feeRate ??= await this.root.Fees.getFeeRate();

        const txs: EVMTx[] = [];

        //Approve first
        if(token.toLowerCase()!==this.root.getNativeCurrencyAddress().toLowerCase())
            txs.push(await this.root.Tokens.Approve(signer, token, amount, this.contract.contractAddress, feeRate));

        txs.push(await this.Deposit(signer, token, amount, feeRate));

        this.logger.debug("txsDeposit(): deposit TX created, token: "+token.toString()+
            " amount: "+amount.toString(10));

        return txs;
    }

}