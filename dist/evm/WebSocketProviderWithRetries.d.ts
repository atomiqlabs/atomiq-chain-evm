import { JsonRpcApiProviderOptions, WebSocketProvider } from "ethers";
import type { Networkish, WebSocketCreator, WebSocketLike } from "ethers";
export declare class WebSocketProviderWithRetries extends WebSocketProvider {
    readonly retryPolicy?: {
        maxRetries?: number;
        delay?: number;
        exponential?: boolean;
    };
    constructor(url: string | WebSocketLike | WebSocketCreator, network?: Networkish, options?: JsonRpcApiProviderOptions & {
        maxRetries?: number;
        delay?: number;
        exponential?: boolean;
    });
    send(method: string, params: Array<any> | Record<string, any>): Promise<any>;
}
