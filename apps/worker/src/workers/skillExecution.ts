/**
 * Skill Execution Worker
 * Handles skill execution via BullMQ (replaces direct spawn)
 */

import { Worker, Job } from 'bullmq'
import { spawn } from 'child_process'
import * as path from 'path'
import {
  getBullMQConnection,
  getStateConnection,
  getStreamConnection,
  REDIS_KEYS,
  createProgressReporter,
  type StreamUpdate,
} from '@elio/workflow'
import type { Redis } from 'ioredis'

export interface SkillExecutionParams {
  jobId: string
  skill: string
  inputs: Record<string, unknown>
  cwd: string
  entrypoint: string
  timeout: number
  requestedBy: string
}

export interface SkillExecutionResult {
  exitCode: number
  status: 'completed' | 'failed' | 'cancelled'
  output?: string
  error?: string
}

const DEFAULT_CONCURRENCY = parseInt(process.env.SKILL_WORKER_CONCURRENCY || '4', 10)

export function createSkillExecutionWorker(config?: { host?: string; port?: number }): Worker {
  const connection = getBullMQConnection(config)

  const worker = new Worker<SkillExecutionParams, SkillExecutionResult>(
    'skill-execution',
    async (job) => processSkillJob(job, config),
    {
      connection,
      concurrency: DEFAULT_CONCURRENCY,
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          return Math.min(5000 * Math.pow(2, attemptsMade - 1), 60000)
        },
      },
    }
  )

  worker.on('completed', (job) => {
    console.log(`[SkillWorker] Job completed: ${job.id}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[SkillWorker] Job failed: ${job?.id}`, err)
  })

  return worker
}

async function processSkillJob(
  job: Job<SkillExecutionParams>,
  config?: { host?: string; port?: number }
): Promise<SkillExecutionResult> {
  const { jobId, skill, inputs, cwd, entrypoint, timeout, requestedBy } = job.data
  const workflowId = `skill-${jobId}`

  const stateRedis = getStateConnection(config)
  const streamRedis = getStreamConnection(config)

  const stateKey = REDIS_KEYS.workflowState(workflowId)
  const outputStream = REDIS_KEYS.workflowOutput(workflowId)

  console.log(`[SkillWorker] Starting skill execution`, { jobId, skill, cwd })

  // Create progress reporter
  const progress = createProgressReporter(workflowId, ['init', 'execute', 'complete'])

  await progress.start(`Running skill: ${skill}`)

  // Update state to running
  const now = Date.now()
  await stateRedis.hset(stateKey, {
    status: 'running',
    lastActivity: now.toString(),
    startedAt: now.toString(),
    skill,
    requestedBy,
  })

  // Build args from inputs
  const args = Object.values(inputs).map(String)
  const entrypointPath = path.join(cwd, entrypoint)

  await progress.startStage('init', `Preparing ${skill}`)

  try {
    await progress.completeStage('init')
    await progress.startStage('execute', `Running ${entrypoint}`)

    const result = await runProcess(entrypointPath, args, cwd, timeout, streamRedis, outputStream)

    await progress.completeStage('execute', 'Process completed')
    await progress.startStage('complete', 'Finalizing')

    // Update state
    await stateRedis.hset(stateKey, {
      status: 'completed',
      completedAt: Date.now().toString(),
      output: result.stdout.substring(0, 10000), // Limit stored output
    })

    // Push completion to stream
    await pushOutput(streamRedis, outputStream, {
      type: 'completed',
      content: result.stdout,
      timestamp: Date.now(),
    })

    await progress.completeStage('complete')
    await progress.complete(result.stdout.substring(0, 500))

    console.log(`[SkillWorker] Skill completed`, { jobId, skill })

    return {
      exitCode: 0,
      status: 'completed',
      output: result.stdout,
    }

  } catch (err) {
    const error = err as Error
    console.error(`[SkillWorker] Skill failed`, { jobId, skill, error: error.message })

    await progress.failStage('execute', error.message)
    await progress.fail(error.message)

    // Update state
    await stateRedis.hset(stateKey, {
      status: 'failed',
      completedAt: Date.now().toString(),
      error: error.message,
    })

    // Push error to stream
    await pushOutput(streamRedis, outputStream, {
      type: 'error',
      content: error.message,
      timestamp: Date.now(),
    })

    return {
      exitCode: 1,
      status: 'failed',
      error: error.message,
    }
  }
}

async function runProcess(
  command: string,
  args: string[],
  cwd: string,
  timeout: number,
  streamRedis: Redis,
  outputStream: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      timeout: timeout * 1000,
      shell: true,
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', async (data) => {
      const chunk = data.toString()
      stdout += chunk

      // Stream output in real-time
      await pushOutput(streamRedis, outputStream, {
        type: 'output',
        content: chunk,
        timestamp: Date.now(),
      })
    })

    proc.stderr?.on('data', async (data) => {
      const chunk = data.toString()
      stderr += chunk

      // Stream errors
      await pushOutput(streamRedis, outputStream, {
        type: 'output',
        content: `[stderr] ${chunk}`,
        timestamp: Date.now(),
      })
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(new Error(`Exit code ${code}: ${stderr || stdout}`))
      }
    })

    proc.on('error', (err) => {
      reject(err)
    })
  })
}

async function pushOutput(
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
