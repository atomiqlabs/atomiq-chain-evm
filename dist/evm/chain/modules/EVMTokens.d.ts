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
}
