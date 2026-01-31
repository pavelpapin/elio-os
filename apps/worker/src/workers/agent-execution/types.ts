/**
 * Type definitions for agent execution worker
 */

import type { Worker } from 'bullmq'
import type { AgentExecutionParams, AgentExecutionResult } from './config.js'

export interface WorkerWithConcurrency extends Worker<AgentExecutionParams, AgentExecutionResult> {
  adjustConcurrency: (delta: number) => void
  getConcurrency: () => number
}
