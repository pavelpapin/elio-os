/**
 * Stale job detection and handling
 */

import { getStateConnection } from '@elio/workflow'
import { STALE_JOB_CHECK_INTERVAL, STALE_JOB_THRESHOLD } from './config.js'

/**
 * Detect and handle stale jobs (no heartbeat for too long)
 */
export function setupStaleJobDetector(config?: { host?: string; port?: number }): void {
  // Use state connection for stale job detection (db 2)
  const redis = getStateConnection(config)

  setInterval(async () => {
    try {
      // Find all running workflows
      const keys = await redis.keys('workflow:*:state')

      for (const key of keys) {
        const state = await redis.hgetall(key)

        if (state.status === 'running' && state.lastActivity) {
          const lastActivity = parseInt(state.lastActivity, 10)
          const now = Date.now()

          if (now - lastActivity > STALE_JOB_THRESHOLD) {
            const workflowId = key.replace('workflow:', '').replace(':state', '')
            console.warn(`[Worker] Stale job detected: ${workflowId}`)

            // Mark as stalled
            await redis.hset(key, 'status', 'stalled', 'stalledAt', now.toString())
          }
        }
      }
    } catch (err) {
      console.error('[Worker] Stale job check error:', err)
    }
  }, STALE_JOB_CHECK_INTERVAL)
}
