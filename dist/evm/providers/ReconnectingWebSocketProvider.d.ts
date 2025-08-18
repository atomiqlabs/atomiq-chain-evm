import { JsonRpcApiProviderOptions } from "ethers";
import type { Networkish, WebSocketLike } from "ethers";
import { SocketProvider } from "./SocketProvider";
export declare class ReconnectingWebSocketProvider extends SocketProvider {
    requestTimeoutSeconds: number;
    reconnectSeconds: number;
    pingIntervalSeconds: number;
    pingInterval: any;
    reconnectTimer: any;
    wsCtor: () => WebSocketLike;
    websocket: null | (WebSocketLike & {
        onclose?: (...args: any[]) => void;
        ping?: () => void;
    });
    constructor(url: string | (() => WebSocketLike), network?: Networkish, options?: JsonRpcApiProviderOptions);
    private connect;
    private disconnectedAndScheduleReconnect;
    _write(message: string): Promise<void>;
    destroy(): Promise<void>;
}
