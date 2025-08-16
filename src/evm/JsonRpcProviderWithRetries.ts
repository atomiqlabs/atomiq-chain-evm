import {JsonRpcProvider, JsonRpcApiProviderOptions} from "ethers";
import type {Networkish, FetchRequest} from "ethers";
import {tryWithRetries} from "../utils/Utils";


export class JsonRpcProviderWithRetries extends JsonRpcProvider {

    readonly retryPolicy?: {
        maxRetries?: number, delay?: number, exponential?: boolean
    };

    constructor(url?: string | FetchRequest, network?: Networkish, options?: JsonRpcApiProviderOptions & {
        maxRetries?: number, delay?: number, exponential?: boolean
    }) {
        super(url, network, options);
        this.retryPolicy = options;
    }

    send(method: string, params: Array<any> | Record<string, any>): Promise<any> {
        return tryWithRetries(() => super.send(method, params), this.retryPolicy, e => {
            // if(e?.error?.code!=null) return false; //Error returned by the RPC
            return true;
        });
    }

}