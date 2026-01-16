import { JsonRpcProvider, JsonRpcApiProviderOptions } from "ethers";
import { Networkish, FetchRequest } from "ethers";
/**
 * @category Providers
 */
export declare class JsonRpcProviderWithRetries extends JsonRpcProvider {
    readonly retryPolicy?: {
        maxRetries?: number;
        delay?: number;
        exponential?: boolean;
    };
    constructor(url: string | FetchRequest, network?: Networkish, options?: JsonRpcApiProviderOptions & {
        maxRetries?: number;
        delay?: number;
        exponential?: boolean;
        timeout?: number;
    });
    send(method: string, params: Array<any> | Record<string, any>): Promise<any>;
}
