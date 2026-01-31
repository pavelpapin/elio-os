/**
 * Agent Runner Types
 * Type definitions and constants for agent process execution
 */

import type { StreamUpdateWithSession } from '@elio/workflow'

/**
 * Default timeout for agent execution (10 minutes)
 */
export const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000

/**
 * Default queue size for bounded async queue
 */
export const DEFAULT_QUEUE_SIZE = 100

/**
 * Options for running an agent
 */
export interface AgentRunOptions {
  runId: string
  prompt: string
  cwd: string
  sessionId?: string
  signal?: AbortSignal
}

/**
 * Configuration for AgentRunner
 */
export interface AgentRunnerConfig {
  name: string
  command: string
  buildArgs: (options: AgentRunOptions) => string[]
  parseOutput: (line: string) => StreamUpdateWithSession | null
  extractSessionId?: (output: string) => string | undefined
  timeoutMs?: number
  queueSize?: number
}

/**
 * Result of spawning an agent process
 */
export interface SpawnResult {
  stream: AsyncGenerator<StreamUpdateWithSession>
  cleanup: () => void
  write: (data: string) => boolean
}
