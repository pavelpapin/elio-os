/**
 * Retry Utility with Exponential Backoff and Verification
 *
 * Addresses CPO report issue: "15% false failure rate for Notion"
 * - Retries with exponential backoff
 * - Verifies operation success before returning
 * - Only reports failure after all retries exhausted AND verification fails
 */

export type { RetryOptions, RetryWithVerifyOptions } from './types.js';
export { withRetry, withRetryAndVerify } from './core.js';
export {
  createServiceRetry,
  notionRetry,
  perplexityRetry,
  gmailRetry,
  linkedinRetry,
} from './services.js';
