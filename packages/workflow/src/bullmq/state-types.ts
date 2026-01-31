/**
 * State Manager Types
 * Type definitions for workflow state management
 */

import type { WorkflowStatus } from '../types.js'

export interface StateUpdate {
  status?: WorkflowStatus
  lastActivity?: number
  completedAt?: number
  startedAt?: number
  error?: string
  progress?: number
  sessionId?: string
  metadata?: Record<string, string>
}

export interface TransitionRule {
  from: WorkflowStatus[]
  to: WorkflowStatus
}

// Valid state transitions
export const VALID_TRANSITIONS: TransitionRule[] = [
  { from: ['pending'], to: 'running' },
  { from: ['running'], to: 'awaiting_input' },
  { from: ['awaiting_input'], to: 'running' },
  { from: ['running', 'awaiting_input'], to: 'completed' },
  { from: ['running', 'awaiting_input'], to: 'failed' },
  { from: ['running', 'awaiting_input', 'pending'], to: 'cancelled' },
  { from: ['running'], to: 'stalled' },
  { from: ['stalled'], to: 'running' },
  { from: ['stalled'], to: 'failed' },
]

/**
 * Check if state transition is valid
 */
export function isValidTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  if (from === to) return true

  return VALID_TRANSITIONS.some(
    rule => rule.from.includes(from) && rule.to === to
  )
}
