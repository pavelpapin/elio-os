/**
 * BullMQ Workflow Client - Type Definitions
 * Re-exports types used by the BullMQ client
 */

export type {
  WorkflowHandle,
  StartOptions,
} from '../types.js'

/**
 * Constants for workflow client
 */
export const WORKFLOW_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
export const STREAM_MAX_LENGTH = 1000 // Auto-cleanup old entries
export const STREAM_BLOCK_MS = 2000 // Block time for xread
export const POLL_INTERVAL_MS = 1000 // Status poll interval
