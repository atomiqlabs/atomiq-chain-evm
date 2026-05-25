import {JsonRpcApiProviderOptions, Network} from "ethers";
import type {Networkish, WebSocketLike} from "ethers";
import {SocketProvider} from "./SocketProvider";
import {getLogger, LoggerType} from "../../utils/Utils";

function getChainIdentifier(network?: Networkish): string {
    if(network==null) return "UNKNOWN";
    if(typeof(network)==="bigint") return network.toString(10);
    if(typeof(network)==="number") return network.toString(10);
    if(typeof(network)==="string") return network;
    if(network instanceof Network) return network.name ?? network.chainId.toString(10);
    return network.name ?? network.chainId?.toString(10) ?? "UNKNOWN";
}

/**
 * WebSocket RPC provider with automatic reconnect, heartbeat ping and connection timeout handling.
 *
 * @category Providers
 */
export class ReconnectingWebSocketProvider extends SocketProvider {

    requestTimeoutSeconds: number = 10;
    reconnectSeconds: number = 5;
    pingIntervalSeconds: number = 30;
    connectionTimeout: number = 10;

    pingInterval: any;
    reconnectTimer: any;
    connectTimer: any;

    wsCtor: () => WebSocketLike;
    websocket: null | WebSocketLike & {onclose?: (...args: any[]) => void, ping?: () => void} = null;

    readonly logger: LoggerType;

    constructor(url: string | (() => WebSocketLike), network?: Networkish, options?: JsonRpcApiProviderOptions) {
        super(network, options);
        this.logger = getLogger("ReconnectingWebSocketProvider("+getChainIdentifier(network)+"): ");
        this.wsCtor = typeof(url)==="string" ? () => new WebSocket(url) : url;
        this.connect();
    }

    private connect() {
        this.websocket = this.wsCtor();

        this.websocket.onopen = () => {
            this._connected();
            this._start();
            clearTimeout(this.connectTimer);
            this.connectTimer = null;

            this.pingInterval = setInterval(() => {
                this._send({method: "eth_chainId", params: [], id: 1_000_000_000, jsonrpc: "2.0"}).catch(e => {
                    //Error
                    if(e.code==="NETWORK_ERROR") {
                        this.logger.error("connect(): pingInterval: Websocket ping error: ", e);
                        if(this.websocket!=null) {
                            this.websocket.close();
                            this.disconnectedAndScheduleReconnect();
                        }
                    }
                });
            }, this.pingIntervalSeconds * 1000);

            this.logger.info("connect(): Websocket connected!");
        };

        this.websocket.onerror = (err) => {
            this.logger.error(`connect(): onerror: Websocket connection error: `, err.error ?? err);
            this.disconnectedAndScheduleReconnect();
        };

        this.websocket.onmessage = (message: { data: string }) => {
            this._processMessage(message.data);
        };

        this.websocket.onclose = (event) => {
            this.logger.error(`connect(): onclose: Websocket connection closed: `, event);
            this.disconnectedAndScheduleReconnect();
        };

        this.connectTimer = setTimeout(() => {
            this.logger.warn("connect(): Websocket connection taking too long, (above "+this.connectionTimeout+" seconds!), closing and re-attempting connection");
            this.websocket!.close();
            this.disconnectedAndScheduleReconnect();
        }, this.connectionTimeout * 1000);
    }

    private disconnectedAndScheduleReconnect() {
        if(this.destroyed) return;
        if(this.websocket==null) return;
        this.websocket.onclose = undefined;
        //Register dummy handler, otherwise we get unhandled `error` event which crashes the whole thing
        this.websocket.onerror = (err) => this.logger.error("disconnectedAndScheduleReconnect(): Post-close onerror: ", err.error ?? err);
        this.websocket.onmessage = null;
        this.websocket.onopen = null;
        this.websocket = null;
        if(this.pingInterval!=null) clearInterval(this.pingInterval);
        if(this.connectTimer!=null) clearInterval(this.connectTimer);

        this._disconnected();

        this.logger.info(`disconnectedAndScheduleReconnect(): Retrying in ${this.reconnectSeconds} seconds...`);
        this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectSeconds * 1000);
    }

    async _write(message: string): Promise<void> {
        if(this.websocket==null) throw new Error("Websocket not connected!");
        this.websocket.send(message);
    }

    async destroy(): Promise<void> {
        if (this.websocket != null) {
            this.websocket.close();
            this.websocket = null;
        }
        if(this.reconnectTimer!=null) clearTimeout(this.reconnectTimer);
        if(this.pingInterval!=null) clearInterval(this.pingInterval);
        if(this.connectTimer!=null) clearInterval(this.connectTimer);
        super.destroy();
    }

}
