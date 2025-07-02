import { JsonRpcApiProvider } from "ethers";
import { EVMChainInterface, EVMRetryPolicy } from "./EVMChainInterface";
export declare class EVMModule<ChainId extends string = string, EVMChainId extends number = number> {
    protected readonly provider: JsonRpcApiProvider;
    protected readonly retryPolicy: EVMRetryPolicy;
    protected readonly root: EVMChainInterface<ChainId, EVMChainId>;
    protected readonly logger: {
        debug: (msg: any, ...args: any[]) => void;
        info: (msg: any, ...args: any[]) => void;
        warn: (msg: any, ...args: any[]) => void;
        error: (msg: any, ...args: any[]) => void;
    };
    constructor(root: EVMChainInterface<ChainId, EVMChainId>);
}
