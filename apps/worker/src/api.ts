/**
 * Health API - Simple HTTP endpoints for monitoring
 *
 * Exposes /health and /metrics endpoints for external monitoring tools.
 * No dependencies - uses Node's built-in http module.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http'
import {
  checkAllRedisHealth,
  runWatchdog,
} from '@elio/workflow'

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  redis: {
    queue: boolean
    stream: boolean
    state: boolean
    default: boolean
  }
  stuck_workflows?: number
  timestamp: string
}

/**
 * Start health API server
 */
export function startHealthAPI(port = 9091): void {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url || '/'

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')

    if (url === '/health') {
      await handleHealth(req, res)
    } else if (url === '/metrics') {
      await handleMetrics(req, res)
    } else if (url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Elio Worker Health API\n\nEndpoints:\n  GET /health\n  GET /metrics\n')
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not Found')
    }
  })

  server.listen(port, () => {
    console.log(`[Health API] Listening on http://localhost:${port}`)
    console.log(`[Health API] Endpoints: /health, /metrics`)
  })

  server.on('error', (err) => {
    console.error('[Health API] Server error:', err)
  })
}

async function handleHealth(req: IncomingMessage, res: ServerResponse) {
  try {
    const redis = await checkAllRedisHealth()
    const watchdog = await runWatchdog().catch(() => ({ killed: 0 }))

    const healthy = redis.queue && redis.stream && redis.state
    const status = healthy ? 'healthy' : (redis.queue ? 'degraded' : 'unhealthy')

    const response: HealthResponse = {
      status,
      uptime: Math.round(process.uptime()),
      redis,
      stuck_workflows: watchdog.killed,
      timestamp: new Date().toISOString(),
    }

    res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(response, null, 2))
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    }))
  }
}

async function handleMetrics(req: IncomingMessage, res: ServerResponse) {
  try {
    const redis = await checkAllRedisHealth()
    const watchdog = await runWatchdog().catch(() => ({ checked: 0, killed: 0 }))
    const mem = process.memoryUsage()

    // Prometheus format
    const metrics = `
# HELP elio_worker_up Worker is running (1 = up, 0 = down)
# TYPE elio_worker_up gauge
elio_worker_up 1

# HELP elio_worker_uptime_seconds Worker uptime in seconds
# TYPE elio_worker_uptime_seconds gauge
elio_worker_uptime_seconds ${Math.round(process.uptime())}

# HELP elio_redis_connection Redis connection status (1 = connected, 0 = down)
# TYPE elio_redis_connection gauge
elio_redis_connection{type="queue"} ${redis.queue ? 1 : 0}
elio_redis_connection{type="stream"} ${redis.stream ? 1 : 0}
elio_redis_connection{type="state"} ${redis.state ? 1 : 0}

# HELP elio_workflows_stuck Number of stuck workflows detected
# TYPE elio_workflows_stuck gauge
elio_workflows_stuck ${watchdog.killed}

# HELP elio_workflows_checked Total workflows checked by watchdog
# TYPE elio_workflows_checked gauge
elio_workflows_checked ${watchdog.checked}

# HELP elio_worker_memory_bytes Worker memory usage in bytes
# TYPE elio_worker_memory_bytes gauge
elio_worker_memory_bytes{type="rss"} ${mem.rss}
elio_worker_memory_bytes{type="heap_used"} ${mem.heapUsed}
elio_worker_memory_bytes{type="heap_total"} ${mem.heapTotal}
`.trim()

    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' })
    res.end(metrics)
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end(`# Error: ${err instanceof Error ? err.message : String(err)}`)
  }
}
