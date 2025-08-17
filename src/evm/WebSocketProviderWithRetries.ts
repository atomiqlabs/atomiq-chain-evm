import {JsonRpcApiProviderOptions, WebSocketProvider} from "ethers";
import type {Networkish, WebSocketCreator, WebSocketLike} from "ethers";
import {tryWithRetries} from "../utils/Utils";


export class WebSocketProviderWithRetries extends WebSocketProvider {

    readonly retryPolicy?: {
        maxRetries?: number, delay?: number, exponential?: boolean
    };

    constructor(url: string | WebSocketLike | WebSocketCreator, network?: Networkish, options?: JsonRpcApiProviderOptions & {
        maxRetries?: number, delay?: number, exponential?: boolean
    }) {
        super(url, network, options);
        this.retryPolicy = options;
    }

    send(method: string, params: Array<any> | Record<string, any>): Promise<any> {
        return tryWithRetries(() => super.send(method, params), this.retryPolicy, e => {
            return false;
            // if(e?.error?.code!=null) return false; //Error returned by the RPC
            // return true;
        });
    }

}