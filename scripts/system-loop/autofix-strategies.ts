/**
 * Auto-Fix: Strategies per failure class
 * Each strategy attempts to resolve a specific type of failure
 */

import { execSync } from 'child_process'
import type { SchedulableItem, RunResult } from './types.js'
import type { FailureClass } from './autofix-classify.js'
import { executeItem } from './executor.js'
import { log } from './utils.js'

export interface FixResult {
  success: boolean
  details?: string
}

export interface FixStrategy {
  name: string
  execute(item: SchedulableItem, result: RunResult): Promise<FixResult>
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

const retryWithBackoff: FixStrategy = {
  name: 'retry-with-backoff',
  async execute(item) {
    // Wait 10s then retry
    log(`[autofix] Waiting 10s before retry for ${item.id}`)
    await sleep(10_000)
    const result = await executeItem(item)
    if (result.success) return { success: true, details: 'Retry succeeded' }

    // Second attempt after 30s
    log(`[autofix] First retry failed, waiting 30s for ${item.id}`)
    await sleep(30_000)
    const result2 = await executeItem(item)
    return {
      success: result2.success,
      details: result2.success ? 'Retry succeeded (2nd attempt)' : `Still failing: ${result2.error}`,
    }
  },
}

const restartService: FixStrategy = {
  name: 'restart-service',
  async execute(item, result) {
    const error = result.error || ''

    if (/redis/i.test(error)) {
      log('[autofix] Restarting Redis...')
      try {
        execSync('systemctl restart redis-server', { timeout: 15_000 })
        await sleep(3000)
        execSync('redis-cli ping', { timeout: 5000 })
        log('[autofix] Redis restarted, retrying item')
      } catch (e) {
        return { success: false, details: `Redis restart failed: ${e}` }
      }
    } else {
      // External service (Supabase, etc.) — wait longer then retry
      log(`[autofix] External service down, waiting 60s for ${item.id}`)
      await sleep(60_000)
    }

    const retryResult = await executeItem(item)
    return {
      success: retryResult.success,
      details: retryResult.success ? 'Service recovered after restart/wait' : `Still down: ${retryResult.error}`,
    }
  },
}

const retryAgentExtended: FixStrategy = {
  name: 'retry-agent-extended',
  async execute(item) {
    // Just retry — executor handles timeout from config
    log(`[autofix] Retrying agent ${item.id} with fresh attempt`)
    await sleep(5000)
    const result = await executeItem(item)
    return {
      success: result.success,
      details: result.success ? 'Agent succeeded on retry' : `Agent failed again: ${result.error}`,
    }
  },
}

const diagnosticRetry: FixStrategy = {
  name: 'diagnostic-retry',
  async execute(item, result) {
    // For script errors: just retry once after short delay
    // (diagnostic agent would be overkill for most script issues)
    log(`[autofix] Script ${item.id} failed, retrying after 15s`)
    await sleep(15_000)
    const retryResult = await executeItem(item)
    return {
      success: retryResult.success,
      details: retryResult.success ? 'Script succeeded on retry' : `Script still failing: ${retryResult.error}`,
    }
  },
}

const strategies: Partial<Record<FailureClass, FixStrategy>> = {
  transient: retryWithBackoff,
  'service-down': restartService,
  'agent-timeout': retryAgentExtended,
  'script-error': diagnosticRetry,
  // 'config-error' and 'unknown' have no strategy — escalate immediately
}

export function getStrategy(failureClass: FailureClass): FixStrategy | null {
  return strategies[failureClass] || null
}
