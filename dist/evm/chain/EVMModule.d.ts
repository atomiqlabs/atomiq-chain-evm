import { JsonRpcApiProvider } from "ethers";
import { EVMChainInterface, EVMRetryPolicy } from "./EVMChainInterface";
export declare class EVMModule<ChainId extends string = string, EVMChainId extends number = number> {
    protected readonly provider: JsonRpcApiProvider;
    protected readonly retryPolicy: EVMRetryPolicy;
    protected readonly root: EVMChainInterface<ChainId, EVMChainId>;
    protected readonly logger: import("../../utils/Utils").LoggerType;
    constructor(root: EVMChainInterface<ChainId, EVMChainId>);
}
