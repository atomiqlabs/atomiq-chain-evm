import { JsonRpcApiProviderOptions } from "ethers";
import type { Networkish } from "ethers";
import { ReconnectingWebSocketProvider } from "./ReconnectingWebSocketProvider";
import type { WebSocketLike } from "ethers/lib.esm";
/**
 * @category Providers
 */
export declare class WebSocketProviderWithRetries extends ReconnectingWebSocketProvider {
    readonly retryPolicy?: {
        maxRetries?: number;
        delay?: number;
        exponential?: boolean;
    };
    constructor(url: string | (() => WebSocketLike), network?: Networkish, options?: JsonRpcApiProviderOptions & {
        maxRetries?: number;
        delay?: number;
        exponential?: boolean;
    });
    send(method: string, params: Array<any> | Record<string, any>): Promise<any>;
}
