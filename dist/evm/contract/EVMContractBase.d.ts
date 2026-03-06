import { BaseContract, Log, TransactionDescription } from "ethers";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import { EVMContractEvents } from "./modules/EVMContractEvents";
import { TypedContractMethod, TypedEventLog } from "../typechain/common";
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
    contract: T;
    readonly Events: EVMContractEvents<T>;
    readonly Chain: EVMChainInterface<any>;
    readonly contractAddress: string;
    readonly contractDeploymentHeight?: number;
    constructor(chainInterface: EVMChainInterface<any>, contractAddress: string, contractAbi: any, contractDeploymentHeight?: number);
    toTypedEvent<TEventName extends keyof T["filters"] = keyof T["filters"]>(log: Log): TypedEventLog<T["filters"][TEventName]> | null;
    parseCalldata<TMethod extends TypedContractMethod>(calldata: string): TypedFunctionCall<TMethod>;
}
export {};
