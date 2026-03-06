/**
 * Logger interface used across EVM modules.
 *
 * @category Internal/Utils
 */
export type LoggerType = {
    debug: (msg: string, ...args: any[]) => void;
    info: (msg: string, ...args: any[]) => void;
    warn: (msg: string, ...args: any[]) => void;
    error: (msg: string, ...args: any[]) => void;
};
/**
 * Returns a promise that resolves after `timeoutMillis` unless aborted first.
 *
 * @category Internal/Utils
 */
export declare function timeoutPromise(timeoutMillis: number, abortSignal?: AbortSignal): Promise<void>;
/**
 * Wraps an async executor so it runs once at a time and reuses the same promise.
 *
 * @category Internal/Utils
 */
export declare function onceAsync<T>(executor: () => Promise<T>): () => Promise<T>;
/**
 * Creates a prefixed logger that honors the global `atomiqLogLevel`.
 *
 * @category Internal/Utils
 */
export declare function getLogger(prefix: string): LoggerType;
/**
 * Retries an async function using the provided retry policy.
 *
 * @category Internal/Utils
 */
export declare function tryWithRetries<T>(func: () => Promise<T>, retryPolicy?: {
    maxRetries?: number;
    delay?: number;
    exponential?: boolean;
}, errorAllowed?: (e: any) => boolean, abortSignal?: AbortSignal): Promise<T>;
/**
 * Reverses byte order of a 32-bit unsigned integer.
 *
 * @category Internal/Utils
 */
export declare function uint32ReverseEndianness(value: number): number;
/**
 * Returns the greater of two bigint values.
 *
 * @category Internal/Utils
 */
export declare function bigIntMax(a: bigint, b: bigint): bigint;
/**
 * Ethers.js error codes considered recoverable for retry logic.
 *
 * @category Internal/Utils
 */
export declare const allowedEthersErrorCodes: Set<string>;
/**
 * JSON-RPC error numbers considered recoverable for retry logic.
 *
 * @category Internal/Utils
 */
export declare const allowedEthersErrorNumbers: Set<number>;
/**
 * RPC error messages considered recoverable for retry logic.
 *
 * @category Internal/Utils
 */
export declare const allowedEthersErrorMessages: Set<string>;
