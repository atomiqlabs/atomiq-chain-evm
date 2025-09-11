"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedEthersErrorMessages = exports.allowedEthersErrorNumbers = exports.allowedEthersErrorCodes = exports.bigIntMax = exports.uint32ReverseEndianness = exports.tryWithRetries = exports.getLogger = exports.onceAsync = exports.timeoutPromise = void 0;
function timeoutPromise(timeoutMillis, abortSignal) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, timeoutMillis);
        if (abortSignal != null)
            abortSignal.addEventListener("abort", () => {
                clearTimeout(timeout);
                reject(new Error("Aborted"));
            });
    });
}
exports.timeoutPromise = timeoutPromise;
function onceAsync(executor) {
    let promise;
    return () => {
        if (promise == null) {
            promise = executor();
            return promise;
        }
        else {
            return promise.catch(() => promise = executor());
        }
    };
}
exports.onceAsync = onceAsync;
function getLogger(prefix) {
    return {
        debug: (msg, ...args) => global.atomiqLogLevel >= 3 && console.debug(prefix + msg, ...args),
        info: (msg, ...args) => global.atomiqLogLevel >= 2 && console.info(prefix + msg, ...args),
        warn: (msg, ...args) => (global.atomiqLogLevel == null || global.atomiqLogLevel >= 1) && console.warn(prefix + msg, ...args),
        error: (msg, ...args) => (global.atomiqLogLevel == null || global.atomiqLogLevel >= 0) && console.error(prefix + msg, ...args)
    };
}
exports.getLogger = getLogger;
const logger = getLogger("Utils: ");
async function tryWithRetries(func, retryPolicy, errorAllowed, abortSignal) {
    retryPolicy = retryPolicy || {};
    retryPolicy.maxRetries = retryPolicy.maxRetries || 5;
    retryPolicy.delay = retryPolicy.delay || 500;
    retryPolicy.exponential = retryPolicy.exponential == null ? true : retryPolicy.exponential;
    let err = null;
    for (let i = 0; i < retryPolicy.maxRetries; i++) {
        try {
            const resp = await func();
            return resp;
        }
        catch (e) {
            if (errorAllowed != null && errorAllowed(e))
                throw e;
            err = e;
            logger.error("tryWithRetries(): error on try number: " + i, e);
        }
        if (abortSignal != null && abortSignal.aborted)
            throw new Error("Aborted");
        if (i !== retryPolicy.maxRetries - 1) {
            await timeoutPromise(retryPolicy.exponential ? retryPolicy.delay * Math.pow(2, i) : retryPolicy.delay, abortSignal);
        }
    }
    throw err;
}
exports.tryWithRetries = tryWithRetries;
function uint32ReverseEndianness(value) {
    const valueBN = BigInt(value);
    return Number(((valueBN & 0xffn) << 24n) |
        ((valueBN & 0xff00n) << 8n) |
        ((valueBN >> 8n) & 0xff00n) |
        ((valueBN >> 24n) & 0xffn));
}
exports.uint32ReverseEndianness = uint32ReverseEndianness;
function bigIntMax(a, b) {
    return a > b ? a : b;
}
exports.bigIntMax = bigIntMax;
exports.allowedEthersErrorCodes = new Set([
    "NOT_IMPLEMENTED", "UNSUPPORTED_OPERATION", "BAD_DATA",
    "NUMERIC_FAULT",
    "INVALID_ARGUMENT", "MISSING_ARGUMENT", "UNEXPECTED_ARGUMENT", "VALUE_MISMATCH",
    "CALL_EXCEPTION", "NONCE_EXPIRED", "REPLACEMENT_UNDERPRICED", "TRANSACTION_REPLACED", "UNCONFIGURED_NAME", "OFFCHAIN_FAULT", "ACTION_REJECTED"
]);
exports.allowedEthersErrorNumbers = new Set([
    -32700,
    -32600,
    -32601,
    // -32602, //Invalid params
    // -32603, //Internal error
    -32000,
    // -32001, //Resource not found
    // -32002, //Resource unavailable
    // -32003, //Transaction rejected
    -32004,
    // -32005, //Limit exceeded
    -32006 //JSON-RPC version not supported
]);
exports.allowedEthersErrorMessages = new Set([
    "already known"
]);
