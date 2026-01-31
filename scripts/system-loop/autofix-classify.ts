/**
 * Auto-Fix: Failure Classification
 * Pattern-matches error strings to determine fix strategy
 */

import type { SchedulableItem, RunResult } from './types.js'

export type FailureClass =
  | 'transient'
  | 'service-down'
  | 'script-error'
  | 'agent-timeout'
  | 'config-error'
  | 'unknown'

const TRANSIENT_PATTERNS = [
  /timeout/i,
  /econnrefused/i,
  /enotfound/i,
  /econnreset/i,
  /rate.?limit/i,
  /too many requests/i,
  /\b429\b/,
  /\b502\b/,
  /\b503\b/,
  /\b504\b/,
  /fetch failed/i,
  /network/i,
]

const SERVICE_DOWN_PATTERNS = [
  /redis/i,
  /connection refused.*6379/,
  /supabase.*unavailable/i,
  /ECONNREFUSED.*5432/,
]

const CONFIG_PATTERNS = [
  /not found.*config/i,
  /missing.*key/i,
  /invalid.*credential/i,
  /no workflow specified/i,
  /script not found/i,
]

export function classifyFailure(item: SchedulableItem, result: RunResult): FailureClass {
  const error = result.error || ''

  // Config errors — not retryable
  if (CONFIG_PATTERNS.some(p => p.test(error))) {
    return 'config-error'
  }

  // Service down — restart + retry
  if (SERVICE_DOWN_PATTERNS.some(p => p.test(error))) {
    return 'service-down'
  }

  // Transient — simple retry
  if (TRANSIENT_PATTERNS.some(p => p.test(error))) {
    return 'transient'
  }

  // Agent timeout
  if (item.type !== 'collector' && /timeout|exceeded time/i.test(error)) {
    return 'agent-timeout'
  }

  // Script crash — diagnostic agent
  if (item.type === 'collector' && error.length > 0) {
    return 'script-error'
  }

  return 'unknown'
}
