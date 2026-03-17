import { JsonRpcProvider, JsonRpcApiProviderOptions } from "ethers";
import { Networkish, FetchRequest } from "ethers";
/**
 * JSON-RPC provider with built-in retry functionality for transient RPC failures.
 *
 * @category Providers
 */
export declare class JsonRpcProviderWithRetries extends JsonRpcProvider {
    readonly retryPolicy?: {
        maxRetries?: number;
        delay?: number;
        exponential?: boolean;
    };
    /**
     * Creates a new JSON-RPC provider which retries RPC calls based on the provided policy.
     *
     * @param url
     * @param network
     * @param options
     */
    constructor(url: string | FetchRequest, network?: Networkish, options?: JsonRpcApiProviderOptions & {
        maxRetries?: number;
        delay?: number;
        exponential?: boolean;
        timeout?: number;
    });
    send(method: string, params: Array<any> | Record<string, any>): Promise<any>;
}
