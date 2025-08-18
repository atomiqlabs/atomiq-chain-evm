import {JsonRpcApiProviderOptions} from "ethers";
import type {Networkish, WebSocketLike} from "ethers";
import {SocketProvider} from "./SocketProvider";


export class ReconnectingWebSocketProvider extends SocketProvider {

    requestTimeoutSeconds: number = 10;
    reconnectSeconds: number = 5;
    pingIntervalSeconds: number = 30;

    pingInterval: any;
    reconnectTimer: any;

    wsCtor: () => WebSocketLike;
    websocket: null | WebSocketLike & {onclose?: (...args: any[]) => void, ping?: () => void};

    constructor(url: string | (() => WebSocketLike), network?: Networkish, options?: JsonRpcApiProviderOptions) {
        super(network, options);
        this.wsCtor = typeof(url)==="string" ? () => new WebSocket(url) : url;
        this.connect();
    }

    private connect() {
        this.websocket = this.wsCtor();

        this.websocket.onopen = () => {
            this._connected();
            this._start();

            this.pingInterval = setInterval(() => {
                this._send({method: "eth_blockNumber", params: [], id: 1_000_000_000, jsonrpc: "2.0"}).catch(e => {
                    //Error
                    if(e.code==="NETWORK_ERROR") {
                        console.error("Websocket ping error: ", e);
                        if(this.websocket!=null) {
                            this.websocket.close();
                            this.disconnectedAndScheduleReconnect();
                        }
                    }
                });
            }, this.pingIntervalSeconds * 1000);
        };

        this.websocket.onerror = (err) => {
            console.error(`Websocket connection error: `, err);
            this.disconnectedAndScheduleReconnect();
        };

        this.websocket.onmessage = (message: { data: string }) => {
            this._processMessage(message.data);
        };

        this.websocket.onclose = (event) => {
            console.error(`Websocket connection closed: `, event);
            this.disconnectedAndScheduleReconnect();
        };
    }

    private disconnectedAndScheduleReconnect() {
        if(this.destroyed) return;
        if(this.websocket==null) return;
        this.websocket.onclose = null;
        this.websocket.onerror = null;
        this.websocket.onmessage = null;
        this.websocket.onopen = null;
        this.websocket = null;
        if(this.pingInterval!=null) clearInterval(this.pingInterval);

        this._disconnected();

        console.error(`Retrying in ${this.reconnectSeconds} seconds...`);
        this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectSeconds * 1000);
    }

    async _write(message: string): Promise<void> {
        this.websocket.send(message);
    }

    async destroy(): Promise<void> {
        if (this.websocket != null) {
            this.websocket.close();
            this.websocket = null;
        }
        if(this.reconnectTimer!=null) {
            clearTimeout(this.reconnectTimer);
        }
        if(this.pingInterval!=null) {
            clearInterval(this.pingInterval);
        }
        super.destroy();
    }

}