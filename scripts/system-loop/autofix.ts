/**
 * Auto-Fix: Main Orchestrator
 * Classifies failures, selects strategy, attempts fix, tracks state
 */

import type { SchedulableItem, RunResult } from './types.js'
import { classifyFailure } from './autofix-classify.js'
import { getStrategy } from './autofix-strategies.js'
import {
  loadFixState,
  saveFixState,
  shouldAttemptFix,
  type FixAttempt,
} from './autofix-state.js'
import { log } from './utils.js'

export interface AutoFixResult {
  fixed: boolean
  attempts: FixAttempt[]
}

export async function attemptAutoFix(
  item: SchedulableItem,
  failedResult: RunResult
): Promise<AutoFixResult> {
  const state = loadFixState()

  // Circuit breaker — max 3 attempts per item per 24h
  if (!shouldAttemptFix(state, item.id)) {
    log(`[autofix] Circuit breaker open for ${item.id}, skipping`)
    return { fixed: false, attempts: [] }
  }

  const failureClass = classifyFailure(item, failedResult)
  const strategy = getStrategy(failureClass)

  if (!strategy) {
    log(`[autofix] No strategy for ${item.id} (class: ${failureClass})`)
    return { fixed: false, attempts: [] }
  }

  log(`[autofix] Attempting fix for ${item.id}: class=${failureClass}, strategy=${strategy.name}`)

  const attempt: FixAttempt = {
    itemId: item.id,
    strategy: strategy.name,
    failureClass,
    timestamp: new Date().toISOString(),
    success: false,
  }

  try {
    const result = await strategy.execute(item, failedResult)
    attempt.success = result.success
    attempt.details = result.details
    log(`[autofix] ${item.id}: ${result.success ? 'FIXED' : 'FAILED'} — ${result.details || ''}`)
  } catch (err) {
    attempt.details = err instanceof Error ? err.message : String(err)
    log(`[autofix] ${item.id}: strategy threw: ${attempt.details}`, 'error')
  }

  state.attempts.push(attempt)
  saveFixState(state)

  return { fixed: attempt.success, attempts: [attempt] }
}
