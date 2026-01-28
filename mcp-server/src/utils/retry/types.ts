/**
 * Retry Utility - Type Definitions
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffFactor?: number;
  /** Service name for circuit breaker integration */
  service?: string;
  /** Use circuit breaker (default: true if service provided) */
  useCircuitBreaker?: boolean;
  /** Retry on specific error codes/messages */
  retryOn?: (error: Error) => boolean;
  /** Callback on each retry */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  /** Operation name for logging */
  operationName?: string;
}

export interface RetryWithVerifyOptions<T> extends RetryOptions {
  /** Verification function - returns true if operation succeeded */
  verify: (result: T) => Promise<boolean> | boolean;
  /** Delay before verification in ms (default: 500) */
  verifyDelay?: number;
  /** Max verification attempts (default: 2) */
  verifyAttempts?: number;
}

export const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'service' | 'retryOn' | 'onRetry' | 'operationName' | 'useCircuitBreaker'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
};
