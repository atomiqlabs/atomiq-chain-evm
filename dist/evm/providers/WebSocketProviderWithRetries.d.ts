import { JsonRpcApiProviderOptions } from "ethers";
import type { Networkish } from "ethers";
import { ReconnectingWebSocketProvider } from "./ReconnectingWebSocketProvider";
import type { WebSocketLike } from "ethers/lib.esm";
/**
 * WebSocket RPC provider with reconnect support and retry logic for transient RPC failures.
 *
 * @category Providers
 */
export declare class WebSocketProviderWithRetries extends ReconnectingWebSocketProvider {
    readonly retryPolicy?: {
        maxRetries?: number;
        delay?: number;
        exponential?: boolean;
    };
    /**
     * Creates a new WebSocket provider which retries RPC calls based on the provided policy.
     *
     * @param url
     * @param network
     * @param options
     */
    constructor(url: string | (() => WebSocketLike), network?: Networkish, options?: JsonRpcApiProviderOptions & {
        maxRetries?: number;
        delay?: number;
        exponential?: boolean;
    });
    send(method: string, params: Array<any> | Record<string, any>): Promise<any>;
}
