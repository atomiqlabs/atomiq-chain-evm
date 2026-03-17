import { EscrowManager } from "./EscrowManagerTypechain";
import { EVMContractModule } from "../contract/EVMContractModule";
import { EVMSwapContract } from "./EVMSwapContract";
import { EVMChainInterface } from "../chain/EVMChainInterface";
/**
 * Base class for EVM swap submodules operating on the escrow manager contract.
 *
 * @category Internal/Swaps
 */
export declare class EVMSwapModule extends EVMContractModule<EscrowManager, EVMSwapContract> {
    readonly swapContract: EscrowManager;
    constructor(chainInterface: EVMChainInterface, contract: EVMSwapContract);
}
