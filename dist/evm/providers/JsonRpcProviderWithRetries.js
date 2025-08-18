"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonRpcProviderWithRetries = void 0;
const ethers_1 = require("ethers");
const Utils_1 = require("../../utils/Utils");
class JsonRpcProviderWithRetries extends ethers_1.JsonRpcProvider {
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
exports.JsonRpcProviderWithRetries = JsonRpcProviderWithRetries;
