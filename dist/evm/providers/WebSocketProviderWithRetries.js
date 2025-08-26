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
            if (e.code != null && typeof (e.code) === "string")
                return Utils_1.allowedEthersErrorCodes.has(e.code);
            return false;
        });
    }
}
exports.WebSocketProviderWithRetries = WebSocketProviderWithRetries;
