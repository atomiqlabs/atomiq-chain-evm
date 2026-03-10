import { BaseContract, TransactionDescription } from "ethers";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import { EVMContractEvents } from "./modules/EVMContractEvents";
import { TypedContractMethod } from "../typechain/common";
type __TypechainOutputObject<T> = T extends TypedContractMethod<infer V> ? V : never;
/**
 * Typed transaction call decoded from calldata for a specific contract method.
 *
 * @category Internal/Contracts
 */
export interface TypedFunctionCall<TCMethod extends TypedContractMethod> extends Omit<TransactionDescription, "args"> {
    args: __TypechainOutputObject<TCMethod>;
}
/**
 * Base contract wrapper providing typed event and calldata parsing helpers.
 *
 * @category Internal/Contracts
 */
export declare class EVMContractBase<T extends BaseContract> {
    readonly contract: T;
    /**
     * @internal
     */
    readonly _Events: EVMContractEvents<T>;
    protected readonly Chain: EVMChainInterface<any>;
    /**
     * @internal
     */
    readonly _contractAddress: string;
    /**
     * @internal
     */
    readonly _contractDeploymentHeight?: number;
    constructor(chainInterface: EVMChainInterface<any>, contractAddress: string, contractAbi: any, contractDeploymentHeight?: number);
    /**
     * @internal
     */
    protected parseCalldata<TMethod extends TypedContractMethod>(calldata: string): TypedFunctionCall<TMethod>;
}
export {};
