import {JsonRpcProvider, JsonRpcApiProviderOptions, makeError} from "ethers";
import type {Networkish, FetchRequest} from "ethers";
import {allowedEthersErrorCodes, tryWithRetries} from "../../utils/Utils";

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
            if(e.code!=null && typeof(e.code)==="string") return allowedEthersErrorCodes.has(e.code);
            return false;
        });
    }

}