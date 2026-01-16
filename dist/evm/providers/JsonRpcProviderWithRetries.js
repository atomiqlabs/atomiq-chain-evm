"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonRpcProviderWithRetries = void 0;
const ethers_1 = require("ethers");
const ethers_2 = require("ethers");
const Utils_1 = require("../../utils/Utils");
/**
 * @category Providers
 */
class JsonRpcProviderWithRetries extends ethers_1.JsonRpcProvider {
    constructor(url, network, options) {
        if (typeof (url) === "string")
            url = new ethers_2.FetchRequest(url);
        url.timeout = options?.timeout ?? 10 * 1000;
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
exports.JsonRpcProviderWithRetries = JsonRpcProviderWithRetries;
