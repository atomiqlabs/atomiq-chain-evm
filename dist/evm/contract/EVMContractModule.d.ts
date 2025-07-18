import { BaseContract } from "ethers";
import { EVMModule } from "../chain/EVMModule";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import { EVMContractBase } from "./EVMContractBase";
export declare class EVMContractModule<T extends BaseContract> extends EVMModule<any> {
    readonly contract: EVMContractBase<T>;
    constructor(chainInterface: EVMChainInterface<any>, contract: EVMContractBase<T>);
}
