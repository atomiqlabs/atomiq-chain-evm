import {EscrowManager} from "./EscrowManagerTypechain";
import {EVMContractModule} from "../contract/EVMContractModule";
import {EVMSwapContract} from "./EVMSwapContract";
import {EVMChainInterface} from "../chain/EVMChainInterface";

export class EVMSwapModule extends EVMContractModule<EscrowManager> {

    readonly contract: EVMSwapContract;
    readonly swapContract: EscrowManager;

    constructor(chainInterface: EVMChainInterface, contract: EVMSwapContract) {
        super(chainInterface, contract);
        this.swapContract = contract.contract;
    }

}
