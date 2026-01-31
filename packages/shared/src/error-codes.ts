/**
 * Common Error Codes and Result Combinators
 */

import type { Result, Ok, Err } from './result.js';
import { ok, err, isOk, isErr } from './result.js';

/**
 * Map over a successful result
 */
export function map<T, E, U>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.data));
  }
  return result;
}

/**
 * Map over an error result
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (isErr(result)) {
    return err(fn(result.error), { code: result.code, details: result.details });
  }
  return result;
}

/**
 * Chain results (flatMap/andThen)
 */
export function andThen<T, E, U>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.data);
  }
  return result;
}

/**
 * Try to execute a function and return a Result
 */
export function tryCatch<T, E = Error>(
  fn: () => T,
  mapError?: (error: unknown) => E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    if (mapError) {
      return err(mapError(error));
    }
    return err(error as E);
  }
}

/**
 * Try to execute an async function and return a Result
 */
export async function tryCatchAsync<T, E = Error>(
  fn: () => Promise<T>,
  mapError?: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (error) {
    if (mapError) {
      return err(mapError(error));
    }
    return err(error as E);
  }
}

/**
 * Combine multiple results into one
 */
export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push(result.data);
  }
  return ok(values);
}

/**
 * Common error codes for standardization
 */
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED: 'MISSING_REQUIRED',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  API_ERROR: 'API_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Create a typed error with code
 */
export function typedErr(
  message: string,
  code: ErrorCode,
  details?: Record<string, unknown>
): Err<string> {
  return err(message, { code, details });
}
