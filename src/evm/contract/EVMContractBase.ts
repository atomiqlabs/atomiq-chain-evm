import {BaseContract, Contract, EventFragment, Log, TransactionDescription, EventLog} from "ethers";
import {EVMChainInterface} from "../chain/EVMChainInterface";
import {EVMContractEvents} from "./modules/EVMContractEvents";
import {TypedContractMethod, TypedEventLog} from "../typechain/common";

type __TypechainOutputObject<T> = T extends TypedContractMethod<
        infer V
    >
    ? V
    : never;

type KeysOfType<T, ValueType> = keyof {
    [K in keyof T]: T[K] extends ValueType ? K : never;
};

export interface TypedFunctionCall<TCMethod extends TypedContractMethod>
    extends Omit<TransactionDescription, "args"> {
    args: __TypechainOutputObject<TCMethod>;
}

/**
 * Base class providing program specific utilities
 */
export class EVMContractBase<T extends BaseContract> {

    contract: T;

    public readonly Events: EVMContractEvents<T>;
    public readonly Chain: EVMChainInterface<any>;

    public readonly contractAddress: string;
    public readonly contractDeploymentHeight: number;

    constructor(
        chainInterface: EVMChainInterface<any>,
        contractAddress: string,
        contractAbi: any,
        contractDeploymentHeight?: number,
    ) {
        this.Chain = chainInterface;
        this.contract = new Contract(contractAddress, contractAbi, chainInterface.provider) as unknown as T;
        this.Events = new EVMContractEvents<T>(chainInterface, this);
        this.contractAddress = contractAddress;
        this.contractDeploymentHeight = contractDeploymentHeight;
    }

    toTypedEvent<TEventName extends keyof T["filters"] = keyof T["filters"]>(log: Log): TypedEventLog<T["filters"][TEventName]> {
        let foundFragment: EventFragment;
        try {
            foundFragment = this.contract.interface.getEvent(log.topics[0]);
        } catch (error) { }
        if(!foundFragment) return null;

        try {
            return new EventLog(log, this.contract.interface, foundFragment) as unknown as TypedEventLog<T["filters"][TEventName]>;
        } catch (error: any) { }
    }

    parseCalldata<TMethod extends TypedContractMethod>(calldata: string): TypedFunctionCall<TMethod> {
        return this.contract.interface.parseTransaction({data: calldata}) as unknown as TypedFunctionCall<TMethod>;
    }

}
