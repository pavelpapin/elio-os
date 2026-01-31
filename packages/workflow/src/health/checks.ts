/**
 * Health Check Functions
 * Individual component health checks
 */

import { getQueueConnection, getStreamConnection, getStateConnection, getBullMQConnection } from '../bullmq/connection.js'

export interface HealthCheckResult {
  component: string
  status: 'ok' | 'error' | 'warn'
  latencyMs?: number
  message?: string
  details?: Record<string, unknown>
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: HealthCheckResult[]
  summary: {
    total: number
    ok: number
    warn: number
    error: number
  }
}

/**
 * Check Redis Queue connection
 */
export async function checkRedisQueue(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const redis = getQueueConnection()
    const pong = await redis.ping()
    return {
      component: 'redis-queue',
      status: pong === 'PONG' ? 'ok' : 'error',
      latencyMs: Date.now() - start,
      details: { db: 0 },
    }
  } catch (err) {
    return {
      component: 'redis-queue',
      status: 'error',
      latencyMs: Date.now() - start,
      message: String(err),
    }
  }
}

/**
 * Check Redis Stream connection
 */
export async function checkRedisStream(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const redis = getStreamConnection()
    const pong = await redis.ping()
    return {
      component: 'redis-stream',
      status: pong === 'PONG' ? 'ok' : 'error',
      latencyMs: Date.now() - start,
      details: { db: 1 },
    }
  } catch (err) {
    return {
      component: 'redis-stream',
      status: 'error',
      latencyMs: Date.now() - start,
      message: String(err),
    }
  }
}

/**
 * Check Redis State connection
 */
export async function checkRedisState(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const redis = getStateConnection()
    const pong = await redis.ping()
    return {
      component: 'redis-state',
      status: pong === 'PONG' ? 'ok' : 'error',
      latencyMs: Date.now() - start,
      details: { db: 2 },
    }
  } catch (err) {
    return {
      component: 'redis-state',
      status: 'error',
      latencyMs: Date.now() - start,
      message: String(err),
    }
  }
}

/**
 * Check BullMQ queue is accessible
 */
export async function checkBullMQQueue(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const { Queue } = await import('bullmq')
    const connection = getBullMQConnection()
    const queue = new Queue('health-check', { connection })

    const counts = await queue.getJobCounts()
    await queue.close()

    return {
      component: 'bullmq-queue',
      status: 'ok',
      latencyMs: Date.now() - start,
      details: { jobCounts: counts },
    }
  } catch (err) {
    return {
      component: 'bullmq-queue',
      status: 'error',
      latencyMs: Date.now() - start,
      message: String(err),
    }
  }
}

/**
 * Check agent-execution queue specifically
 */
export async function checkAgentQueue(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const { Queue } = await import('bullmq')
    const connection = getBullMQConnection()
    const queue = new Queue('agent-execution', { connection })

    const counts = await queue.getJobCounts()
    const workers = await queue.getWorkers()
    await queue.close()

    const hasWorkers = workers.length > 0

    return {
      component: 'agent-queue',
      status: hasWorkers ? 'ok' : 'warn',
      latencyMs: Date.now() - start,
      message: hasWorkers ? undefined : 'No workers connected',
      details: {
        jobCounts: counts,
        workerCount: workers.length,
      },
    }
  } catch (err) {
    return {
      component: 'agent-queue',
      status: 'error',
      latencyMs: Date.now() - start,
      message: String(err),
    }
  }
}

/**
 * Check stream write/read capability
 */
export async function checkStreamIO(): Promise<HealthCheckResult> {
  const start = Date.now()
  const testKey = `health:stream:${Date.now()}`

  try {
    const redis = getStreamConnection()

    const id = await redis.xadd(testKey, '*', 'test', 'value')
    const result = await redis.xread('STREAMS', testKey, '0')
    await redis.del(testKey)

    const success = result !== null && id !== null

    return {
      component: 'stream-io',
      status: success ? 'ok' : 'error',
      latencyMs: Date.now() - start,
      message: success ? undefined : 'Stream read/write failed',
    }
  } catch (err) {
    return {
      component: 'stream-io',
      status: 'error',
      latencyMs: Date.now() - start,
      message: String(err),
    }
  }
}

/**
 * Check state write/read capability
 */
export async function checkStateIO(): Promise<HealthCheckResult> {
  const start = Date.now()
  const testKey = `health:state:${Date.now()}`

  try {
    const redis = getStateConnection()

    await redis.hset(testKey, 'test', 'value')
    const value = await redis.hget(testKey, 'test')
    await redis.del(testKey)

    const success = value === 'value'

    return {
      component: 'state-io',
      status: success ? 'ok' : 'error',
      latencyMs: Date.now() - start,
      message: success ? undefined : 'State read/write failed',
    }
  } catch (err) {
    return {
      component: 'state-io',
      status: 'error',
      latencyMs: Date.now() - start,
      message: String(err),
    }
  }
}
