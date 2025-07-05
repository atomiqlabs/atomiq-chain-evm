import {EVMModule} from "../EVMModule";
import {Contract, TransactionRequest} from "ethers";
import {ERC20Abi} from "./ERC20Abi";
import {EVMAddresses} from "./EVMAddresses";
import {EVMFees} from "./EVMFees";
import {EVMSwapData} from "../../swaps/EVMSwapData";


export class EVMTokens extends EVMModule<any> {

    public static readonly ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

    public static readonly GasCosts = {
        TRANSFER: 80_000 + 21_000,
        APPROVE: 80_000 + 21_000
    };

    private getContract(address: string) {
        return new Contract(address, ERC20Abi, this.root.provider);
    }

    ///////////////////
    //// Tokens
    /**
     * Checks if the provided string is a valid starknet token
     *
     * @param token
     */
    public isValidToken(token: string) {
        return EVMAddresses.isValidAddress(token);
    }

    /**
     * Returns the token balance of the address
     *
     * @param address
     * @param token
     */
    public async getTokenBalance(address: string, token: string): Promise<bigint> {
        let balance: bigint;
        if(token === "0x0000000000000000000000000000000000000000") {
            balance = await this.provider.getBalance(address);
        } else {
            const erc20 = this.getContract(token);
            balance = await erc20.balanceOf(address);
        }
        this.logger.debug("getTokenBalance(): token balance fetched, token: "+token+
            " address: "+address+" amount: "+balance.toString(10));

        return balance;
    }

    /**
     * Returns the native currency address
     */
    public getNativeCurrencyAddress(): string {
        return "0x0000000000000000000000000000000000000000";
    }

    ///////////////////
    //// Transfers
    /**
     * Creates transactions for sending the over the tokens
     *
     * @param signer
     * @param token token to send
     * @param amount amount of the token to send
     * @param recipient recipient's address
     * @param feeRate fee rate to use for the transactions
     * @private
     */
    public async Transfer(signer: string, token: string, amount: bigint, recipient: string, feeRate?: string): Promise<TransactionRequest> {
        let tx: TransactionRequest;
        if(token===this.getNativeCurrencyAddress()) {
            tx = {
                to: recipient,
                value: amount
            };
        } else {
            tx = await this.getContract(token).transfer.populateTransaction(recipient, amount);
        }
        tx.from = signer;
        EVMFees.applyFeeRate(tx, EVMTokens.GasCosts.TRANSFER, feeRate ?? await this.root.Fees.getFeeRate());

        this.logger.debug("txsTransfer(): transfer TX created, recipient: "+recipient.toString()+
            " token: "+token.toString()+ " amount: "+amount.toString(10));

        return tx;
    }

    ///////////////////
    //// Approval
    /**
     * Creates transactions for approving spending of tokens
     *
     * @param signer
     * @param token token to send
     * @param amount amount of the token to send
     * @param spender recipient's address
     * @param feeRate fee rate to use for the transactions
     * @private
     */
    public async Approve(signer: string, token: string, amount: bigint, spender: string, feeRate?: string): Promise<TransactionRequest> {
        if(token===this.getNativeCurrencyAddress()) return null;

        const tx = await this.getContract(token).approve.populateTransaction(spender, amount);
        tx.from = signer;
        EVMFees.applyFeeRate(tx, EVMTokens.GasCosts.APPROVE, feeRate ?? await this.root.Fees.getFeeRate());

        this.logger.debug("txsTransfer(): approve TX created, spender: "+spender.toString()+
        " token: "+token.toString()+ " amount: "+amount.toString(10));

        return tx;
    }

    async getApproveFee(feeRate?: string): Promise<bigint> {
        feeRate ??= await this.root.Fees.getFeeRate();
        return EVMFees.getGasFee(EVMTokens.GasCosts.APPROVE, feeRate);
    }

    async getTransferFee(feeRate?: string): Promise<bigint> {
        feeRate ??= await this.root.Fees.getFeeRate();
        return EVMFees.getGasFee(EVMTokens.GasCosts.APPROVE, feeRate);
    }

}
