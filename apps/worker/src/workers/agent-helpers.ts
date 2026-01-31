/**
 * Agent Execution Worker - Helper Functions
 * Types, utilities, monitoring, and support functions for agent execution
 */

import { Worker } from 'bullmq'
import { Redis } from 'ioredis'
import * as os from 'os'
import {
  createRedisConnection,
  getStateConnection,
  REDIS_KEYS,
  type StreamUpdate,
} from '@elio/workflow'

// Configuration constants
export const DEFAULT_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '4', 10)
export const MIN_CONCURRENCY = 1
export const MAX_CONCURRENCY = parseInt(process.env.WORKER_MAX_CONCURRENCY || '8', 10)
export const STALE_JOB_CHECK_INTERVAL = 60000 // 1 minute
export const STALE_JOB_THRESHOLD = 300000 // 5 minutes without activity
export const CONCURRENCY_ADJUST_INTERVAL = 30000 // 30 seconds
export const CPU_THRESHOLD_HIGH = 80 // Reduce concurrency when CPU > 80%
export const CPU_THRESHOLD_LOW = 40 // Increase concurrency when CPU < 40%
export const MEMORY_THRESHOLD = 85 // Reduce concurrency when memory > 85%
export const HEARTBEAT_INTERVAL = 5000 // Update lastActivity every 5 seconds

// Type definitions
export interface AgentExecutionParams {
  workflowId: string
  params: {
    prompt: string
    cwd?: string
    chatId?: string | number
    sessionId?: string
  }
}

export interface AgentExecutionResult {
  exitCode: number
  status: 'completed' | 'failed' | 'cancelled'
  sessionId?: string
}

export interface WorkerWithConcurrency extends Worker {
  adjustConcurrency: (delta: number) => void
  getConcurrency: () => number
}

export interface RedisConfig {
  host?: string
  port?: number
}

/**
 * Push update to Redis stream
 */
export async function pushOutput(
  redis: Redis,
  streamKey: string,
  update: StreamUpdate
): Promise<void> {
  await redis.xadd(
    streamKey,
    'MAXLEN', '~', '1000',
    '*',
    'type', update.type,
    'content', update.content,
    'timestamp', update.timestamp.toString()
  )
}

/**
 * Create heartbeat interval for workflow state updates
 */
export function createHeartbeat(
  stateRedis: Redis,
  stateKey: string
): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      await stateRedis.hset(stateKey, 'lastActivity', Date.now().toString())
    } catch (err) {
      console.error('[Worker] Heartbeat error:', err)
    }
  }, HEARTBEAT_INTERVAL)
}

/**
 * Subscribe to workflow signals (user input, cancellation)
 */
export async function subscribeToSignals(
  signalChannel: string,
  config?: RedisConfig
): Promise<Redis> {
  const subscriber = createRedisConnection('state', config)
  await subscriber.subscribe(signalChannel)
  return subscriber
}

/**
 * Handle signal messages from user
 */
export function createSignalHandler(
  workflowId: string,
  stateKey: string,
  outputStream: string,
  result: { write: (data: string) => boolean },
  runner: { kill: (id: string) => boolean },
  stateRedis: Redis,
  streamRedis: Redis,
  exitStatusRef: { current: 'completed' | 'failed' | 'cancelled' }
) {
  return async (channel: string, message: string) => {
    try {
      const { signal, data } = JSON.parse(message)
      console.log(`[Worker] Received signal: ${signal}`, { workflowId, data })

      switch (signal) {
        case 'userInput':
          result.write(String(data))
          await pushOutput(streamRedis, outputStream, {
            type: 'input_echo',
            content: `> ${data}`,
            timestamp: Date.now(),
          })
          await stateRedis.hset(stateKey, 'status', 'running')
          break

        case 'interrupt':
        case 'cancel':
          runner.kill(workflowId)
          exitStatusRef.current = 'cancelled'
          break
      }
    } catch (err) {
      console.error('[Worker] Error processing signal:', err)
    }
  }
}

/**
 * Monitor system resources and adjust concurrency dynamically
 */
export function setupDynamicConcurrency(worker: WorkerWithConcurrency): void {
  setInterval(() => {
    try {
      // Get CPU usage (average across all cores)
      const cpus = os.cpus()
      let totalIdle = 0
      let totalTick = 0

      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times]
        }
        totalIdle += cpu.times.idle
      }

      const cpuUsage = 100 - (totalIdle / totalTick * 100)

      // Get memory usage
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const memUsage = ((totalMem - freeMem) / totalMem) * 100

      // Adjust concurrency based on load
      const currentConcurrency = worker.getConcurrency()

      if (memUsage > MEMORY_THRESHOLD) {
        // Memory pressure - reduce aggressively
        worker.adjustConcurrency(-2)
        console.log(`[Worker] High memory (${memUsage.toFixed(1)}%), reducing concurrency`)
      } else if (cpuUsage > CPU_THRESHOLD_HIGH) {
        // High CPU - reduce by 1
        worker.adjustConcurrency(-1)
        console.log(`[Worker] High CPU (${cpuUsage.toFixed(1)}%), reducing concurrency`)
      } else if (cpuUsage < CPU_THRESHOLD_LOW && memUsage < 70) {
        // Low load - can increase
        worker.adjustConcurrency(1)
        console.log(`[Worker] Low load (CPU: ${cpuUsage.toFixed(1)}%, Mem: ${memUsage.toFixed(1)}%), increasing concurrency`)
      }

    } catch (err) {
      console.error('[Worker] Dynamic concurrency check error:', err)
    }
  }, CONCURRENCY_ADJUST_INTERVAL)
}

/**
 * Detect and handle stale jobs (no heartbeat for too long)
 */
export function setupStaleJobDetector(config?: RedisConfig): void {
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
