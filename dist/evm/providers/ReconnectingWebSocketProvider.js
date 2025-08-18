"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconnectingWebSocketProvider = void 0;
const SocketProvider_1 = require("./SocketProvider");
class ReconnectingWebSocketProvider extends SocketProvider_1.SocketProvider {
    constructor(url, network, options) {
        super(network, options);
        this.requestTimeoutSeconds = 10;
        this.reconnectSeconds = 5;
        this.pingIntervalSeconds = 30;
        this.wsCtor = typeof (url) === "string" ? () => new WebSocket(url) : url;
        this.connect();
    }
    connect() {
        this.websocket = this.wsCtor();
        this.websocket.onopen = () => {
            this._connected();
            this._start();
            this.pingInterval = setInterval(() => {
                this._send({ method: "eth_blockNumber", params: [], id: 1000000000, jsonrpc: "2.0" }).catch(e => {
                    //Error
                    if (e.code === "NETWORK_ERROR") {
                        console.error("Websocket ping error: ", e);
                        if (this.websocket != null) {
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
        this.websocket.onmessage = (message) => {
            this._processMessage(message.data);
        };
        this.websocket.onclose = (event) => {
            console.error(`Websocket connection closed: `, event);
            this.disconnectedAndScheduleReconnect();
        };
    }
    disconnectedAndScheduleReconnect() {
        if (this.destroyed)
            return;
        if (this.websocket == null)
            return;
        this.websocket.onclose = null;
        this.websocket.onerror = null;
        this.websocket.onmessage = null;
        this.websocket.onopen = null;
        this.websocket = null;
        if (this.pingInterval != null)
            clearInterval(this.pingInterval);
        this._disconnected();
        console.error(`Retrying in ${this.reconnectSeconds} seconds...`);
        this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectSeconds * 1000);
    }
    async _write(message) {
        this.websocket.send(message);
    }
    async destroy() {
        if (this.websocket != null) {
            this.websocket.close();
            this.websocket = null;
        }
        if (this.reconnectTimer != null) {
            clearTimeout(this.reconnectTimer);
        }
        if (this.pingInterval != null) {
            clearInterval(this.pingInterval);
        }
        super.destroy();
    }
}
exports.ReconnectingWebSocketProvider = ReconnectingWebSocketProvider;
