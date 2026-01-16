"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketProviderWithRetries = void 0;
const Utils_1 = require("../../utils/Utils");
const ReconnectingWebSocketProvider_1 = require("./ReconnectingWebSocketProvider");
/**
 * @category Providers
 */
class WebSocketProviderWithRetries extends ReconnectingWebSocketProvider_1.ReconnectingWebSocketProvider {
    constructor(url, network, options) {
        super(url, network, options);
        this.retryPolicy = options;
    }
    send(method, params) {
        return (0, Utils_1.tryWithRetries)(() => super.send(method, params), this.retryPolicy, e => {
            if (e.code != null && typeof (e.code) === "string" && Utils_1.allowedEthersErrorCodes.has(e.code))
                return true;
            if (e.error?.code != null && typeof (e.error.code) === "number" && Utils_1.allowedEthersErrorNumbers.has(e.error.code))
                return true;
            if (e.error?.message != null && typeof (e.error.message) === "string" && Utils_1.allowedEthersErrorMessages.has(e.error.message))
                return true;
            return false;
        });
    }
}
exports.WebSocketProviderWithRetries = WebSocketProviderWithRetries;
