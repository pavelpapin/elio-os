/**
 * Retry Utility - Helper Functions
 */

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffFactor: number
): number {
  const exponentialDelay = initialDelay * Math.pow(backoffFactor, attempt - 1);
  const jitter = Math.random() * 0.2 * exponentialDelay; // 0-20% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Retryable conditions
  const retryablePatterns = [
    'timeout',
    'abort',
    'econnreset',
    'econnrefused',
    'socket hang up',
    'network',
    'rate limit',
    '429', // Too Many Requests
    '502', // Bad Gateway
    '503', // Service Unavailable
    '504', // Gateway Timeout
    'temporarily unavailable',
    'try again',
    'service unavailable',
  ];

  return retryablePatterns.some(pattern => message.includes(pattern));
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
