

export type LoggerType = {
    debug: (msg: string, ...args: any[]) => void,
    info: (msg: string, ...args: any[]) => void,
    warn: (msg: string, ...args: any[]) => void,
    error: (msg: string, ...args: any[]) => void,
}

export function timeoutPromise(timeoutMillis: number, abortSignal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, timeoutMillis)
        if(abortSignal!=null) abortSignal.addEventListener("abort", () => {
            clearTimeout(timeout);
            reject(new Error("Aborted"));
        })
    });
}

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

export function getLogger(prefix: string): LoggerType {
    return {
        debug: (msg, ...args) => global.atomiqLogLevel >= 3 && console.debug(prefix+msg, ...args),
        info: (msg, ...args) => global.atomiqLogLevel >= 2 && console.info(prefix+msg, ...args),
        warn: (msg, ...args) => (global.atomiqLogLevel==null || global.atomiqLogLevel >= 1) && console.warn(prefix+msg, ...args),
        error: (msg, ...args) => (global.atomiqLogLevel==null || global.atomiqLogLevel >= 0) && console.error(prefix+msg, ...args)
    };
}

const logger = getLogger("Utils: ");

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

export function uint32ReverseEndianness(value: number): number {
    const valueBN = BigInt(value);
    return Number(((valueBN & 0xFFn) << 24n) |
        ((valueBN & 0xFF00n) << 8n) |
        ((valueBN >> 8n) & 0xFF00n) |
        ((valueBN >> 24n) & 0xFFn));
}

export function bigIntMax(a: bigint, b: bigint) {
    return a>b ? a : b;
}

export const allowedEthersErrorCodes: Set<string> = new Set([
    "NOT_IMPLEMENTED", "UNSUPPORTED_OPERATION", "BAD_DATA",
    "NUMERIC_FAULT",
    "INVALID_ARGUMENT", "MISSING_ARGUMENT", "UNEXPECTED_ARGUMENT", "VALUE_MISMATCH",
    "CALL_EXCEPTION", "NONCE_EXPIRED", "REPLACEMENT_UNDERPRICED", "TRANSACTION_REPLACED", "UNCONFIGURED_NAME", "OFFCHAIN_FAULT", "ACTION_REJECTED"
]);

export const allowedEthersErrorNumbers: Set<number> = new Set([
    -32700, //Invalid JSON
    -32600, //Invalid request
    -32601, //Method not found
    // -32602, //Invalid params
    // -32603, //Internal error
    -32000, //Invalid input
    // -32001, //Resource not found
    // -32002, //Resource unavailable
    // -32003, //Transaction rejected
    -32004, //Method not supported
    // -32005, //Limit exceeded
    -32006 //JSON-RPC version not supported
]);

export const allowedEthersErrorMessages: Set<string> = new Set([
    "already known"
]);
