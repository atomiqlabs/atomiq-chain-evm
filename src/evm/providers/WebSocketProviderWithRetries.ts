import {JsonRpcApiProviderOptions} from "ethers";
import type {Networkish} from "ethers";
import {
    allowedEthersErrorCodes,
    allowedEthersErrorMessages,
    allowedEthersErrorNumbers,
    tryWithRetries
} from "../../utils/Utils";
import {ReconnectingWebSocketProvider} from "./ReconnectingWebSocketProvider";
import type {WebSocketLike} from "ethers/lib.esm";

/**
 * @category Providers
 */
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
            if(e.code!=null && typeof(e.code)==="string" && allowedEthersErrorCodes.has(e.code)) return true;
            if(e.error?.code!=null && typeof(e.error.code)==="number" && allowedEthersErrorNumbers.has(e.error.code)) return true;
            if(e.error?.message!=null && typeof(e.error.message)==="string" && allowedEthersErrorMessages.has(e.error.message)) return true;
            return false;
        });
    }

}