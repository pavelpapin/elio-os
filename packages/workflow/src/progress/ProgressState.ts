/**
 * Progress State Management
 * Handles Redis state persistence for workflow progress
 */

import type { Redis } from 'ioredis'
import { REDIS_KEYS, type WorkflowStatus } from '../types.js'

export interface ProgressStage {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startedAt?: number
  completedAt?: number
  error?: string
}

export interface ProgressState {
  workflowId: string
  status: WorkflowStatus
  progress: number
  currentStage?: string
  stages: ProgressStage[]
  startedAt: number
  lastActivity: number
  completedAt?: number
  error?: string
  metadata?: Record<string, unknown>
}

export function createInitialState(workflowId: string, stages: string[]): ProgressState {
  return {
    workflowId,
    status: 'pending',
    progress: 0,
    stages: stages.map(name => ({ name, status: 'pending' })),
    startedAt: Date.now(),
    lastActivity: Date.now(),
  }
}

export function findStage(state: ProgressState, name: string): ProgressStage | undefined {
  return state.stages.find(s => s.name === name)
}

export function updateProgress(state: ProgressState): void {
  const total = state.stages.length
  if (total === 0) return

  const completed = state.stages.filter(
    s => s.status === 'completed' || s.status === 'skipped'
  ).length
  const running = state.stages.filter(s => s.status === 'running').length

  state.progress = Math.round(((completed + running * 0.5) / total) * 100)
}

export async function syncStateToRedis(redis: Redis, state: ProgressState): Promise<void> {
  const stateKey = REDIS_KEYS.workflowState(state.workflowId)

  await redis.hset(stateKey, {
    status: state.status,
    progress: state.progress.toString(),
    currentStage: state.currentStage || '',
    startedAt: state.startedAt.toString(),
    lastActivity: state.lastActivity.toString(),
    completedAt: state.completedAt?.toString() || '',
    error: state.error || '',
    stages: JSON.stringify(state.stages),
    metadata: JSON.stringify(state.metadata || {}),
  })
}
