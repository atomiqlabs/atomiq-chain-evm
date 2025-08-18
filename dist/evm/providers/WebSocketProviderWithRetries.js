"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketProviderWithRetries = void 0;
const Utils_1 = require("../../utils/Utils");
const ReconnectingWebSocketProvider_1 = require("./ReconnectingWebSocketProvider");
class WebSocketProviderWithRetries extends ReconnectingWebSocketProvider_1.ReconnectingWebSocketProvider {
    constructor(url, network, options) {
        super(url, network, options);
        this.retryPolicy = options;
    }
    send(method, params) {
        return (0, Utils_1.tryWithRetries)(() => super.send(method, params), this.retryPolicy, e => {
            return false;
            // if(e?.error?.code!=null) return false; //Error returned by the RPC
            // return true;
        });
    }
}
exports.WebSocketProviderWithRetries = WebSocketProviderWithRetries;
