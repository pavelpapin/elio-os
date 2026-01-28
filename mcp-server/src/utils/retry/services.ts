/**
 * Retry Utility - Service-Specific Configurations
 */

import type { RetryOptions, RetryWithVerifyOptions } from './types.js';
import { withRetry, withRetryAndVerify } from './core.js';

/**
 * Create a reusable retry configuration for a specific service
 */
export function createServiceRetry(
  service: string,
  defaultOptions: Partial<RetryOptions> = {}
) {
  return {
    /**
     * Execute with retry for this service
     */
    retry: <T>(fn: () => Promise<T>, options?: Partial<RetryOptions>) =>
      withRetry(fn, { service, ...defaultOptions, ...options }),

    /**
     * Execute with retry and verification for this service
     */
    retryAndVerify: <T>(
      fn: () => Promise<T>,
      verify: (result: T) => Promise<boolean> | boolean,
      options?: Partial<Omit<RetryWithVerifyOptions<T>, 'verify'>>
    ) =>
      withRetryAndVerify(fn, { service, verify, ...defaultOptions, ...options }),
  };
}

// Pre-configured service retries
export const notionRetry = createServiceRetry('notion', {
  maxRetries: 3,
  initialDelay: 1000,
});

export const perplexityRetry = createServiceRetry('perplexity', {
  maxRetries: 5,
  initialDelay: 2000,
});

export const gmailRetry = createServiceRetry('gmail', {
  maxRetries: 3,
  initialDelay: 1000,
});

export const linkedinRetry = createServiceRetry('linkedin', {
  maxRetries: 2,
  initialDelay: 5000,
  maxDelay: 60000,
});
