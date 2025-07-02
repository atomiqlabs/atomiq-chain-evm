import {getLogger} from "../../utils/Utils";
import {JsonRpcApiProvider} from "ethers";
import {EVMChainInterface, EVMRetryPolicy} from "./EVMChainInterface";

export class EVMModule<ChainId extends string = string, EVMChainId extends number = number> {

    protected readonly provider: JsonRpcApiProvider;
    protected readonly retryPolicy: EVMRetryPolicy;
    protected readonly root: EVMChainInterface<ChainId, EVMChainId>;

    protected readonly logger = getLogger(this.constructor.name+": ");

    constructor(
        root: EVMChainInterface<ChainId, EVMChainId>
    ) {
        this.provider = root.provider;
        this.retryPolicy = root.retryPolicy;
        this.root = root;
    }

}
