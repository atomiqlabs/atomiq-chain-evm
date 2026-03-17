import {EscrowManager} from "./EscrowManagerTypechain";
import {EVMContractModule} from "../contract/EVMContractModule";
import {EVMSwapContract} from "./EVMSwapContract";
import {EVMChainInterface} from "../chain/EVMChainInterface";

/**
 * Base class for EVM swap submodules operating on the escrow manager contract.
 *
 * @category Internal/Swaps
 */
export class EVMSwapModule extends EVMContractModule<EscrowManager, EVMSwapContract> {

    readonly swapContract: EscrowManager;

    constructor(chainInterface: EVMChainInterface, contract: EVMSwapContract) {
        super(chainInterface, contract);
        this.swapContract = contract.contract;
    }

}
