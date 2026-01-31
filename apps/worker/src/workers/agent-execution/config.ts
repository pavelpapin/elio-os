/**
 * Agent execution worker configuration
 */

// Worker configuration constants
export const DEFAULT_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '4', 10)
export const MIN_CONCURRENCY = 1
export const MAX_CONCURRENCY = parseInt(process.env.WORKER_MAX_CONCURRENCY || '8', 10)
export const STALE_JOB_CHECK_INTERVAL = 60000 // 1 minute
export const STALE_JOB_THRESHOLD = 300000 // 5 minutes without activity
export const CONCURRENCY_ADJUST_INTERVAL = 30000 // 30 seconds
export const CPU_THRESHOLD_HIGH = 80 // Reduce concurrency when CPU > 80%
export const CPU_THRESHOLD_LOW = 40 // Increase concurrency when CPU < 40%
export const MEMORY_THRESHOLD = 85 // Reduce concurrency when memory > 85%
export const HEARTBEAT_INTERVAL = 5000 // 5 seconds

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
