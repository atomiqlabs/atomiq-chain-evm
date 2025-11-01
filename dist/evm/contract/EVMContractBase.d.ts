import { BaseContract, Log, TransactionDescription } from "ethers";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import { EVMContractEvents } from "./modules/EVMContractEvents";
import { TypedContractMethod, TypedEventLog } from "../typechain/common";
type __TypechainOutputObject<T> = T extends TypedContractMethod<infer V> ? V : never;
export interface TypedFunctionCall<TCMethod extends TypedContractMethod> extends Omit<TransactionDescription, "args"> {
    args: __TypechainOutputObject<TCMethod>;
}
/**
 * Base class providing program specific utilities
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
