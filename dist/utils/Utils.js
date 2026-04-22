"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceBigInts = exports.allowedEthersErrorMessages = exports.allowedEthersErrorNumbers = exports.allowedEthersErrorCodes = exports.bigIntMax = exports.uint32ReverseEndianness = exports.tryWithRetries = exports.getLogger = exports.onceAsync = exports.timeoutPromise = void 0;
/**
 * Returns a promise that resolves after `timeoutMillis` unless aborted first.
 *
 * @category Internal/Utils
 */
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
/**
 * Wraps an async executor so it runs once at a time and reuses the same promise.
 *
 * @category Internal/Utils
 */
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
/**
 * Creates a prefixed logger that honors the global `atomiqLogLevel`.
 *
 * @category Internal/Utils
 */
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
/**
 * Retries an async function using the provided retry policy.
 *
 * @category Internal/Utils
 */
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
/**
 * Reverses byte order of a 32-bit unsigned integer.
 *
 * @category Internal/Utils
 */
function uint32ReverseEndianness(value) {
    const valueBN = BigInt(value);
    return Number(((valueBN & 0xffn) << 24n) |
        ((valueBN & 0xff00n) << 8n) |
        ((valueBN >> 8n) & 0xff00n) |
        ((valueBN >> 24n) & 0xffn));
}
exports.uint32ReverseEndianness = uint32ReverseEndianness;
/**
 * Returns the greater of two bigint values.
 *
 * @category Internal/Utils
 */
function bigIntMax(a, b) {
    return a > b ? a : b;
}
exports.bigIntMax = bigIntMax;
/**
 * Ethers.js error codes considered recoverable for retry logic.
 *
 * @category Internal/Utils
 */
exports.allowedEthersErrorCodes = new Set([
    "NOT_IMPLEMENTED", "UNSUPPORTED_OPERATION", "BAD_DATA",
    "NUMERIC_FAULT",
    "INVALID_ARGUMENT", "MISSING_ARGUMENT", "UNEXPECTED_ARGUMENT", "VALUE_MISMATCH",
    "CALL_EXCEPTION", "NONCE_EXPIRED", "REPLACEMENT_UNDERPRICED", "TRANSACTION_REPLACED", "UNCONFIGURED_NAME", "OFFCHAIN_FAULT", "ACTION_REJECTED"
]);
/**
 * JSON-RPC error numbers considered recoverable for retry logic.
 *
 * @category Internal/Utils
 */
exports.allowedEthersErrorNumbers = new Set([
    3,
    -32700,
    -32600,
    -32601,
    -32602,
    // -32603, //Internal error
    -32000,
    // -32001, //Resource not found
    // -32002, //Resource unavailable
    // -32003, //Transaction rejected
    -32004,
    // -32005, //Limit exceeded
    -32006 //JSON-RPC version not supported
]);
/**
 * RPC error messages considered recoverable for retry logic.
 *
 * @category Internal/Utils
 */
exports.allowedEthersErrorMessages = new Set([
    "already known"
]);
function replaceBigInts(obj) {
    const replace = (value) => {
        if (typeof (value) === "bigint")
            return "0x" + value.toString(16);
        if (value == null || typeof (value) !== "object")
            return value;
        if (Array.isArray(value)) {
            return value.map(replace);
        }
        const mapped = {};
        for (const key of Object.keys(value)) {
            mapped[key] = replace(value[key]);
        }
        return mapped;
    };
    return replace(obj);
}
exports.replaceBigInts = replaceBigInts;
