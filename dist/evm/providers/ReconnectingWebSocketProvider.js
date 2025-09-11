"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconnectingWebSocketProvider = void 0;
const SocketProvider_1 = require("./SocketProvider");
const Utils_1 = require("../../utils/Utils");
const logger = (0, Utils_1.getLogger)("ReconnectingWebSocketProvider: ");
class ReconnectingWebSocketProvider extends SocketProvider_1.SocketProvider {
    constructor(url, network, options) {
        super(network, options);
        this.requestTimeoutSeconds = 10;
        this.reconnectSeconds = 5;
        this.pingIntervalSeconds = 30;
        this.connectionTimeout = 30;
        this.wsCtor = typeof (url) === "string" ? () => new WebSocket(url) : url;
        this.connect();
    }
    connect() {
        this.websocket = this.wsCtor();
        this.websocket.onopen = () => {
            this._connected();
            this._start();
            clearTimeout(this.connectTimer);
            this.connectTimer = null;
            this.pingInterval = setInterval(() => {
                this._send({ method: "eth_chainId", params: [], id: 1000000000, jsonrpc: "2.0" }).catch(e => {
                    //Error
                    if (e.code === "NETWORK_ERROR") {
                        logger.error("connect(): pingInterval: Websocket ping error: ", e);
                        if (this.websocket != null) {
                            this.websocket.close();
                            this.disconnectedAndScheduleReconnect();
                        }
                    }
                });
            }, this.pingIntervalSeconds * 1000);
            logger.info("connect(): Websocket connected!");
        };
        this.websocket.onerror = (err) => {
            logger.error(`connect(): onerror: Websocket connection error: `, err);
            this.disconnectedAndScheduleReconnect();
        };
        this.websocket.onmessage = (message) => {
            this._processMessage(message.data);
        };
        this.websocket.onclose = (event) => {
            logger.error(`connect(): onclose: Websocket connection closed: `, event);
            this.disconnectedAndScheduleReconnect();
        };
        this.connectTimer = setTimeout(() => {
            logger.warn("connect(): Websocket connection taking too long, (above " + this.connectionTimeout + " seconds!), closing and re-attempting connection");
            this.websocket.close();
            this.disconnectedAndScheduleReconnect();
        }, this.connectionTimeout * 1000);
    }
    disconnectedAndScheduleReconnect() {
        if (this.destroyed)
            return;
        if (this.websocket == null)
            return;
        this.websocket.onclose = null;
        //Register dummy handler, otherwise we get unhandled `error` event which crashes the whole thing
        this.websocket.onerror = (err) => logger.error("disconnectedAndScheduleReconnect(): Post-close onerror: ", err);
        this.websocket.onmessage = null;
        this.websocket.onopen = null;
        this.websocket = null;
        if (this.pingInterval != null)
            clearInterval(this.pingInterval);
        if (this.connectTimer != null)
            clearInterval(this.connectTimer);
        this._disconnected();
        logger.info(`disconnectedAndScheduleReconnect(): Retrying in ${this.reconnectSeconds} seconds...`);
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
        if (this.reconnectTimer != null)
            clearTimeout(this.reconnectTimer);
        if (this.pingInterval != null)
            clearInterval(this.pingInterval);
        if (this.connectTimer != null)
            clearInterval(this.connectTimer);
        super.destroy();
    }
}
exports.ReconnectingWebSocketProvider = ReconnectingWebSocketProvider;
