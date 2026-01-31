/**
 * Workflow Watchdog - Auto-recovery for stuck workflows
 *
 * Monitors workflow state and automatically marks stuck workflows as failed.
 * Prevents infinite hangs by detecting workflows with no progress.
 */

import { Redis } from 'ioredis'
import { getStateConnection } from './bullmq/connection.js'
import { REDIS_KEYS } from './types.js'

const STUCK_THRESHOLD_MS = 2 * 60 * 60 * 1000 // 2 hours without update
const INITIALIZING_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes in initializing state

export interface WatchdogResult {
  checked: number
  killed: number
  workflows: Array<{
    id: string
    reason: string
    idleTime: number
  }>
}

/**
 * Find and kill stuck workflows
 */
export async function runWatchdog(redis?: Redis): Promise<WatchdogResult> {
  const stateRedis = redis || getStateConnection()
  const now = Date.now()
  const result: WatchdogResult = {
    checked: 0,
    killed: 0,
    workflows: [],
  }

  try {
    const pattern = 'workflow:*:state'
    const keys = await stateRedis.keys(pattern)
    result.checked = keys.length

    for (const key of keys) {
      const state = await stateRedis.hgetall(key)
      if (!state || Object.keys(state).length === 0) continue

      const workflowId = key.replace('workflow:', '').replace(':state', '')
      const status = state.status
      const lastUpdateStr = state.lastUpdateAt || state.updatedAt || state.startedAt || '0'
      const lastUpdate = parseInt(lastUpdateStr, 10)
      const idleTime = now - lastUpdate

      // Check for stuck workflows
      let shouldKill = false
      let reason = ''

      // Case 1: Stuck in 'initializing' for >5 minutes
      if (status === 'initializing' && idleTime > INITIALIZING_TIMEOUT_MS) {
        shouldKill = true
        reason = 'Stuck in initializing state'
      }

      // Case 2: Running but no updates for >2 hours
      if (status === 'running' && idleTime > STUCK_THRESHOLD_MS) {
        shouldKill = true
        reason = 'No progress for 2+ hours'
      }

      // Case 3: Pending but no updates for >2 hours (probably abandoned)
      if (status === 'pending' && idleTime > STUCK_THRESHOLD_MS) {
        shouldKill = true
        reason = 'Pending with no progress for 2+ hours'
      }

      if (shouldKill) {
        await stateRedis.hset(key, 'status', 'failed')
        await stateRedis.hset(key, 'error', `Watchdog: ${reason}`)
        await stateRedis.hset(key, 'failedAt', now.toString())

        result.killed++
        result.workflows.push({
          id: workflowId,
          reason,
          idleTime: Math.round(idleTime / 1000 / 60), // minutes
        })

        console.log(
          `[Watchdog] Killed stuck workflow ${workflowId}: ${reason} (idle: ${Math.round(idleTime / 60000)}min)`,
        )
      }
    }
  } finally {
    if (!redis) {
      await stateRedis.quit()
    }
  }

  return result
}

/**
 * Start watchdog that runs periodically
 */
export function startWatchdog(intervalMs = 5 * 60 * 1000): NodeJS.Timeout {
  console.log(`[Watchdog] Started (interval: ${intervalMs / 1000}s)`)

  const interval = setInterval(async () => {
    try {
      const result = await runWatchdog()

      if (result.killed > 0) {
        console.log(`[Watchdog] Killed ${result.killed} stuck workflows:`)
        result.workflows.forEach(w => {
          console.log(`  - ${w.id}: ${w.reason} (${w.idleTime}min idle)`)
        })
      }
    } catch (err) {
      console.error('[Watchdog] Error:', err)
    }
  }, intervalMs)

  return interval
}
