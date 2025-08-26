import {JsonRpcApiProviderOptions} from "ethers";
import type {Networkish} from "ethers";
import {allowedEthersErrorCodes, tryWithRetries} from "../../utils/Utils";
import {ReconnectingWebSocketProvider} from "./ReconnectingWebSocketProvider";
import type {WebSocketLike} from "ethers/lib.esm";


export class WebSocketProviderWithRetries extends ReconnectingWebSocketProvider {

    readonly retryPolicy?: {
        maxRetries?: number, delay?: number, exponential?: boolean
    };

    constructor(url: string | (() => WebSocketLike), network?: Networkish, options?: JsonRpcApiProviderOptions & {
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