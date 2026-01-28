/**
 * Retry Utility - Core Functions
 */

import { fileLogger } from '../file-logger.js';
import { notifyTelegram } from '../progress.js';
import { withCircuitBreaker, recordSuccess, recordFailure } from '../circuit-breaker.js';
import type { RetryOptions, RetryWithVerifyOptions } from './types.js';
import { DEFAULT_OPTIONS } from './types.js';
import { calculateDelay, isRetryableError, sleep } from './utils.js';

/**
 * Execute function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    initialDelay = DEFAULT_OPTIONS.initialDelay,
    maxDelay = DEFAULT_OPTIONS.maxDelay,
    backoffFactor = DEFAULT_OPTIONS.backoffFactor,
    service,
    useCircuitBreaker = !!service,
    retryOn,
    onRetry,
    operationName = 'operation',
  } = options;

  let lastError: Error = new Error('No attempts made');

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      // Use circuit breaker if service provided
      const result = useCircuitBreaker && service
        ? await withCircuitBreaker(service, fn)
        : await fn();

      // Record success if using circuit breaker
      if (service && !useCircuitBreaker) {
        recordSuccess(service);
      }

      if (attempt > 1) {
        fileLogger.info('retry', `${operationName} succeeded on attempt ${attempt}`, { service });
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldRetry = retryOn
        ? retryOn(lastError)
        : isRetryableError(lastError);

      // Last attempt or non-retryable error
      if (attempt > maxRetries || !shouldRetry) {
        if (service) {
          recordFailure(service, lastError.message);
        }
        fileLogger.error('retry', `${operationName} failed after ${attempt} attempts`, {
          service,
          error: lastError.message,
        });
        throw lastError;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffFactor);

      fileLogger.warn('retry', `${operationName} failed, retrying in ${delay}ms`, {
        service,
        attempt,
        maxRetries,
        error: lastError.message,
      });

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, lastError, delay);
      }

      await sleep(delay);
    }
  }

  // This shouldn't be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Execute function with retry logic AND verification
 * Only reports failure after verification confirms the operation failed
 */
export async function withRetryAndVerify<T>(
  fn: () => Promise<T>,
  options: RetryWithVerifyOptions<T>
): Promise<T> {
  const {
    verify,
    verifyDelay = 500,
    verifyAttempts = 2,
    operationName = 'operation',
    service,
    ...retryOptions
  } = options;

  let lastResult: T | undefined;
  let lastError: Error | undefined;

  // First, try with standard retry
  try {
    lastResult = await withRetry(fn, { ...retryOptions, service, operationName });
    return lastResult;
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));

    // Operation failed - but let's verify it really failed
    fileLogger.info('retry', `${operationName} reported failure, verifying...`, {
      service,
      error: lastError.message,
    });
  }

  // Verification phase: check if operation actually succeeded despite error
  for (let verifyAttempt = 1; verifyAttempt <= verifyAttempts; verifyAttempt++) {
    await sleep(verifyDelay * verifyAttempt);

    try {
      // If we have a result from a previous attempt, verify it
      if (lastResult !== undefined) {
        const verified = await verify(lastResult);
        if (verified) {
          fileLogger.info('retry', `${operationName} verified successful after retry`, { service });
          if (service) {
            recordSuccess(service);
          }
          return lastResult;
        }
      }

      // Try one more time with verification immediately after
      try {
        const result = await fn();
        const verified = await verify(result);

        if (verified) {
          fileLogger.info('retry', `${operationName} succeeded on verification attempt ${verifyAttempt}`, {
            service,
          });
          if (service) {
            recordSuccess(service);
          }
          return result;
        }

        lastResult = result;
      } catch {
        // Continue to next verification attempt
      }
    } catch (verifyError) {
      fileLogger.warn('retry', `Verification attempt ${verifyAttempt} failed`, {
        service,
        error: String(verifyError),
      });
    }
  }

  // All attempts exhausted, report genuine failure
  fileLogger.error('retry', `${operationName} failed after all retries and verification`, {
    service,
    error: lastError?.message,
  });

  // Notify about persistent failure
  if (service) {
    await notifyTelegram(`❌ ${service}: ${operationName} failed after ${retryOptions.maxRetries || 3} retries + verification`);
  }

  throw lastError || new Error(`${operationName} failed after all attempts`);
}
