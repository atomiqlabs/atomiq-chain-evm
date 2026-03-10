import {getLogger} from "../../utils/Utils";
import {JsonRpcApiProvider} from "ethers";
import {EVMChainInterface, EVMRetryPolicy} from "./EVMChainInterface";

/**
 * Base module class shared by EVM chain submodules.
 *
 * @category Internal/Chain
 */
export class EVMModule<ChainId extends string = string> {

    protected readonly provider: JsonRpcApiProvider;
    protected readonly retryPolicy?: EVMRetryPolicy;
    protected readonly root: EVMChainInterface<ChainId>;

    protected readonly logger = getLogger(this.constructor.name+": ");

    constructor(
        root: EVMChainInterface<ChainId>
    ) {
        this.provider = root.provider;
        this.retryPolicy = root._retryPolicy;
        this.root = root;
    }

}
