import {JsonRpcProvider, JsonRpcApiProviderOptions, makeError, JsonRpcPayload, JsonRpcResult} from "ethers";
import {Networkish, FetchRequest} from "ethers";
import {
    allowedEthersErrorCodes,
    allowedEthersErrorMessages,
    allowedEthersErrorNumbers,
    tryWithRetries
} from "../../utils/Utils";

/**
 * JSON-RPC provider with built-in retry functionality for transient RPC failures.
 *
 * @category Providers
 */
export class JsonRpcProviderWithRetries extends JsonRpcProvider {

    readonly retryPolicy?: {
        maxRetries?: number, delay?: number, exponential?: boolean
    };

    /**
     * Creates a new JSON-RPC provider which retries RPC calls based on the provided policy.
     *
     * @param url
     * @param network
     * @param options
     */
    constructor(url: string | FetchRequest, network?: Networkish, options?: JsonRpcApiProviderOptions & {
        maxRetries?: number, delay?: number, exponential?: boolean, timeout?: number
    }) {
        if(typeof(url)==="string") url = new FetchRequest(url);
        url.timeout = options?.timeout ?? 10*1000;
        super(url, network, options);
        this.retryPolicy = options;
    }

    send(method: string, params: Array<any> | Record<string, any>): Promise<any> {
        return tryWithRetries(() => super.send(method, params), this.retryPolicy, e => {
            if(e.code!=null && typeof(e.code)==="string" && allowedEthersErrorCodes.has(e.code)) return true;
            if(e.error?.code!=null && typeof(e.error.code)==="number" && allowedEthersErrorNumbers.has(e.error.code)) return true;
            if(e.error?.message!=null && typeof(e.error.message)==="string" && allowedEthersErrorMessages.has(e.error.message)) return true;
            return false;
        });
    }

}
