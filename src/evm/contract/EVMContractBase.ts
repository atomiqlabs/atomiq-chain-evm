import {BaseContract, Contract} from "ethers";
import {EVMChainInterface} from "../chain/EVMChainInterface";
import {EVMContractEvents} from "./modules/EVMContractEvents";

/**
 * Base class providing program specific utilities
 */
export class EVMContractBase<T extends BaseContract> {

    contract: T;

    public readonly Events: EVMContractEvents<T>;
    public readonly Chain: EVMChainInterface<any>;

    public readonly contractAddress: string;

    constructor(
        chainInterface: EVMChainInterface<any>,
        contractAddress: string,
        contractAbi: any
    ) {
        this.Chain = chainInterface;
        this.contract = new Contract(contractAddress, contractAbi, chainInterface.provider) as unknown as T;
        this.Events = new EVMContractEvents<T>(chainInterface, this);
        this.contractAddress = contractAddress;
    }

}
