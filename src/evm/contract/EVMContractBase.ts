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

/**
 * Typed transaction call decoded from calldata for a specific contract method.
 *
 * @category Internal/Contracts
 */
export interface TypedFunctionCall<TCMethod extends TypedContractMethod>
    extends Omit<TransactionDescription, "args"> {
    args: __TypechainOutputObject<TCMethod>;
}

/**
 * Base contract wrapper providing typed event and calldata parsing helpers.
 *
 * @category Internal/Contracts
 */
export class EVMContractBase<T extends BaseContract> {

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

    constructor(
        chainInterface: EVMChainInterface<any>,
        contractAddress: string,
        contractAbi: any,
        contractDeploymentHeight?: number,
    ) {
        this.Chain = chainInterface;
        this.contract = new Contract(contractAddress, contractAbi, chainInterface.provider) as unknown as T;
        this._Events = new EVMContractEvents<T>(chainInterface, this);
        this._contractAddress = contractAddress;
        this._contractDeploymentHeight = contractDeploymentHeight;
    }

    /**
     * @internal
     */
    protected parseCalldata<TMethod extends TypedContractMethod>(calldata: string): TypedFunctionCall<TMethod> {
        return this.contract.interface.parseTransaction({data: calldata}) as unknown as TypedFunctionCall<TMethod>;
    }

}
