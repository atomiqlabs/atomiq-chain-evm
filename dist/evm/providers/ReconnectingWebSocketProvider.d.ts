import { JsonRpcApiProviderOptions } from "ethers";
import type { Networkish, WebSocketLike } from "ethers";
import { SocketProvider } from "./SocketProvider";
import { LoggerType } from "../../utils/Utils";
/**
 * WebSocket RPC provider with automatic reconnect, heartbeat ping and connection timeout handling.
 *
 * @category Providers
 */
export declare class ReconnectingWebSocketProvider extends SocketProvider {
    requestTimeoutSeconds: number;
    reconnectSeconds: number;
    pingIntervalSeconds: number;
    connectionTimeout: number;
    pingInterval: any;
    reconnectTimer: any;
    connectTimer: any;
    wsCtor: () => WebSocketLike;
    websocket: null | (WebSocketLike & {
        onclose?: (...args: any[]) => void;
        ping?: () => void;
    });
    readonly logger: LoggerType;
    constructor(url: string | (() => WebSocketLike), network?: Networkish, options?: JsonRpcApiProviderOptions);
    private connect;
    private disconnectedAndScheduleReconnect;
    _write(message: string): Promise<void>;
    destroy(): Promise<void>;
}
