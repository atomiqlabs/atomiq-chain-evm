import { EVMModule } from "../EVMModule";
import { TransactionRequest } from "ethers";
export declare class EVMTokens extends EVMModule<any> {
    static readonly ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
    static readonly GasCosts: {
        TRANSFER: number;
        APPROVE: number;
    };
    private getContract;
    /**
     * Checks if the provided string is a valid starknet token
     *
     * @param token
     */
    isValidToken(token: string): boolean;
    /**
     * Returns the token balance of the address
     *
     * @param address
     * @param token
     */
    getTokenBalance(address: string, token: string): Promise<bigint>;
    /**
     * Returns the authorized allowance of specific address towards a spender contract
     *
     * @param spender A contract trying to spend user's erc20 balance
     * @param address Wallet address
     * @param token ERC-20 token
     */
    getTokenAllowance(spender: string, address: string, token: string): Promise<bigint>;
    /**
     * Returns the native currency address
     */
    getNativeCurrencyAddress(): string;
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
    Transfer(signer: string, token: string, amount: bigint, recipient: string, feeRate?: string): Promise<TransactionRequest>;
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
    Approve(signer: string, token: string, amount: bigint, spender: string, feeRate?: string): Promise<TransactionRequest>;
    /**
     * Checks whether an approve transaction is required for a given token and either returns the tx
     *  or null in case the approve is not required
     *
     * @param signer
     * @param token token to approve for
     * @param amount amount of the token to send
     * @param spender spending contract address
     * @param feeRate fee rate to use for the transactions
     */
    checkAndGetApproveTx(signer: string, token: string, amount: bigint, spender: string, feeRate?: string): Promise<TransactionRequest | null>;
    getApproveFee(feeRate?: string): Promise<bigint>;
    getTransferFee(feeRate?: string): Promise<bigint>;
}
