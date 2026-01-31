/**
 * Result Type - Unified Error Handling
 *
 * A type-safe way to handle errors without throwing exceptions.
 * Inspired by Rust's Result type and functional programming patterns.
 */

/**
 * Success result
 */
export interface Ok<T> {
  readonly ok: true;
  readonly data: T;
  readonly error?: never;
}

/**
 * Failure result
 */
export interface Err<E = string> {
  readonly ok: false;
  readonly data?: never;
  readonly error: E;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Result type - either Ok or Err
 */
export type Result<T, E = string> = Ok<T> | Err<E>;

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

export function err<E = string>(
  error: E,
  options?: { code?: string; details?: Record<string, unknown> }
): Err<E> {
  return { ok: false, error, code: options?.code, details: options?.details };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

export function match<T, E, R>(
  result: Result<T, E>,
  handlers: {
    ok: (data: T) => R;
    err: (error: E, code?: string, details?: Record<string, unknown>) => R;
  }
): R {
  if (isOk(result)) {
    return handlers.ok(result.data);
  }
  return handlers.err(result.error, result.code, result.details);
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) return result.data;
  throw new Error(String(result.error));
}

export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) return result.data;
  return defaultValue;
}

// Re-export combinators and error codes from extracted module
export { map, mapErr, andThen, tryCatch, tryCatchAsync, all } from './error-codes.js';
export { ErrorCodes, typedErr } from './error-codes.js';
export type { ErrorCode } from './error-codes.js';
