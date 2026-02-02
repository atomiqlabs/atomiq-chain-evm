import { BaseContract } from "ethers";
import { EVMModule } from "../chain/EVMModule";
import { EVMChainInterface } from "../chain/EVMChainInterface";
import { EVMContractBase } from "./EVMContractBase";
export declare class EVMContractModule<T extends BaseContract, C extends EVMContractBase<T> = EVMContractBase<T>> extends EVMModule<any> {
    readonly contract: C;
    constructor(chainInterface: EVMChainInterface<any>, contract: C);
}
