

export type ReplaceBigInt<T> =
    T extends bigint
        ? string
        : T extends (infer U)[]
            ? ReplaceBigInt<U>[]
            : T extends readonly (infer U)[]
                ? readonly ReplaceBigInt<U>[]
                : T extends object
                    ? { [K in keyof T]: ReplaceBigInt<T[K]> }
                    : T;

/**
 * Logger interface used across EVM modules.
 *
 * @category Internal/Utils
 */
export type LoggerType = {
    debug: (msg: string, ...args: any[]) => void,
    info: (msg: string, ...args: any[]) => void,
    warn: (msg: string, ...args: any[]) => void,
    error: (msg: string, ...args: any[]) => void,
}

/**
 * Returns a promise that resolves after `timeoutMillis` unless aborted first.
 *
 * @category Internal/Utils
 */
export function timeoutPromise(timeoutMillis: number, abortSignal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, timeoutMillis)
        if(abortSignal!=null) abortSignal.addEventListener("abort", () => {
            clearTimeout(timeout);
            reject(new Error("Aborted"));
        })
    });
}

/**
 * Wraps an async executor so it runs once at a time and reuses the same promise.
 *
 * @category Internal/Utils
 */
export function onceAsync<T>(executor: () => Promise<T>): () => Promise<T> {
    let promise: Promise<T>;

    return () => {
        if(promise==null) {
            promise = executor();
            return promise;
        } else {
            return promise.catch(() => promise = executor());
        }
    }
}

/**
 * Creates a prefixed logger that honors the global `atomiqLogLevel`.
 *
 * @category Internal/Utils
 */
export function getLogger(prefix: string): LoggerType {
    return {
        debug: (msg, ...args) => (global as any).atomiqLogLevel >= 3 && console.debug(prefix+msg, ...args),
        info: (msg, ...args) => (global as any).atomiqLogLevel >= 2 && console.info(prefix+msg, ...args),
        warn: (msg, ...args) => ((global as any).atomiqLogLevel==null || (global as any).atomiqLogLevel >= 1) && console.warn(prefix+msg, ...args),
        error: (msg, ...args) => ((global as any).atomiqLogLevel==null || (global as any).atomiqLogLevel >= 0) && console.error(prefix+msg, ...args)
    };
}

const logger = getLogger("Utils: ");

/**
 * Retries an async function using the provided retry policy.
 *
 * @category Internal/Utils
 */
export async function tryWithRetries<T>(func: () => Promise<T>, retryPolicy?: {
    maxRetries?: number, delay?: number, exponential?: boolean
}, errorAllowed?: (e: any) => boolean, abortSignal?: AbortSignal): Promise<T> {
    retryPolicy = retryPolicy || {};
    retryPolicy.maxRetries = retryPolicy.maxRetries || 5;
    retryPolicy.delay = retryPolicy.delay || 500;
    retryPolicy.exponential =  retryPolicy.exponential==null ? true : retryPolicy.exponential;

    let err = null;

    for(let i=0;i<retryPolicy.maxRetries;i++) {
        try {
            const resp: T = await func();
            return resp;
        } catch (e) {
            if(errorAllowed!=null && errorAllowed(e)) throw e;
            err = e;
            logger.error("tryWithRetries(): error on try number: "+i, e);
        }
        if(abortSignal!=null && abortSignal.aborted) throw new Error("Aborted");
        if(i!==retryPolicy.maxRetries-1) {
            await timeoutPromise(
                retryPolicy.exponential ? retryPolicy.delay*Math.pow(2, i) : retryPolicy.delay,
                abortSignal
            );
        }
    }

    throw err;
}

/**
 * Reverses byte order of a 32-bit unsigned integer.
 *
 * @category Internal/Utils
 */
export function uint32ReverseEndianness(value: number): number {
    const valueBN = BigInt(value);
    return Number(((valueBN & 0xFFn) << 24n) |
        ((valueBN & 0xFF00n) << 8n) |
        ((valueBN >> 8n) & 0xFF00n) |
        ((valueBN >> 24n) & 0xFFn));
}

/**
 * Returns the greater of two bigint values.
 *
 * @category Internal/Utils
 */
export function bigIntMax(a: bigint, b: bigint) {
    return a>b ? a : b;
}

/**
 * Ethers.js error codes considered recoverable for retry logic.
 *
 * @category Internal/Utils
 */
export const allowedEthersErrorCodes: Set<string> = new Set([
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
export const allowedEthersErrorNumbers: Set<number> = new Set([
    3, //Revertion during eth_getAccessList call
    -32700, //Invalid JSON
    -32600, //Invalid request
    -32601, //Method not found
    -32602, //Invalid params
    // -32603, //Internal error
    -32000, //Invalid input
    // -32001, //Resource not found
    // -32002, //Resource unavailable
    // -32003, //Transaction rejected
    -32004, //Method not supported
    // -32005, //Limit exceeded
    -32006 //JSON-RPC version not supported
]);

/**
 * RPC error messages considered recoverable for retry logic.
 *
 * @category Internal/Utils
 */
export const allowedEthersErrorMessages: Set<string> = new Set([
    "already known"
]);

export function replaceBigInts<T>(obj: T): ReplaceBigInt<T> {
    const replace = (value: any): any => {
        if(typeof(value)==="bigint") return "0x"+value.toString(16);
        if(value==null || typeof(value)!=="object") return value;

        if(Array.isArray(value)) {
            return value.map(replace);
        }

        const mapped: any = {};
        for(const key of Object.keys(value)) {
            mapped[key] = replace(value[key]);
        }
        return mapped;
    };

    return replace(obj);
}

