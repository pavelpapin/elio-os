/**
 * Startup Health Validation
 *
 * Validates all critical dependencies before worker starts.
 * Fails fast if anything is missing instead of crash looping.
 */

import {
  checkAllRedisHealth,
  cleanupOrphanedWorkflows,
  closeAllConnections,
} from '@elio/workflow'

interface ValidationCheck {
  name: string
  fn: () => Promise<void> | void
  critical: boolean
}

export async function validateStartup(): Promise<void> {
  console.log('[Startup] Running health checks...')

  const checks: ValidationCheck[] = [
    {
      name: 'Redis Connections',
      critical: true,
      fn: async () => {
        const health = await checkAllRedisHealth()
        if (!health.queue) {
          throw new Error('Redis queue connection failed')
        }
        if (!health.stream) {
          throw new Error('Redis stream connection failed')
        }
        if (!health.state) {
          throw new Error('Redis state connection failed')
        }
      },
    },
    {
      name: 'Required Functions',
      critical: true,
      fn: () => {
        const required = [
          { name: 'cleanupOrphanedWorkflows', fn: cleanupOrphanedWorkflows },
          { name: 'closeAllConnections', fn: closeAllConnections },
          { name: 'checkAllRedisHealth', fn: checkAllRedisHealth },
        ]

        for (const { name, fn } of required) {
          if (typeof fn !== 'function') {
            throw new Error(`Required function '${name}' is not available`)
          }
        }
      },
    },
    {
      name: 'Worker Modules',
      critical: true,
      fn: async () => {
        await import('./workers/agentExecution.js')
        await import('./workers/scheduledTask.js')
        await import('./workers/skillExecution.js')
      },
    },
    {
      name: 'Environment Variables',
      critical: false,
      fn: () => {
        const optional = ['REDIS_HOST', 'REDIS_PORT', 'WORKER_CONCURRENCY']
        const missing = optional.filter(key => !process.env[key])
        if (missing.length > 0) {
          console.warn(`[Startup] Optional env vars not set: ${missing.join(', ')}`)
        }
      },
    },
  ]

  let failed = false

  for (const check of checks) {
    try {
      await check.fn()
      console.log(`[Startup] ✓ ${check.name}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      if (check.critical) {
        console.error(`[Startup] ✗ ${check.name}: ${message}`)
        failed = true
      } else {
        console.warn(`[Startup] ⚠ ${check.name}: ${message}`)
      }
    }
  }

  if (failed) {
    console.error('[Startup] Critical checks failed. Exiting to prevent crash loop.')
    console.error('[Startup] Fix the issues above and restart the service.')
    process.exit(1)
  }

  console.log('[Startup] All critical checks passed ✓')
}
