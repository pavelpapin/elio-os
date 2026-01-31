/**
 * Progress Reporter Types
 */

import type { WorkflowStatus } from '../types.js'
import type { NotificationChannel } from '../notifications/types.js'

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

export interface ProgressReporterConfig {
  /** Telegram chat ID for notifications */
  chatId?: number | string
  /** Notification channel (Telegram, etc.) */
  notificationChannel?: NotificationChannel
  /** Debounce interval for notifications (ms) */
  notificationDebounceMs?: number
  /** Whether to send Telegram notifications */
  enableNotifications?: boolean
  /** Max stream entries before cleanup */
  maxStreamEntries?: number
}

export const DEFAULT_CONFIG: Required<Omit<ProgressReporterConfig, 'chatId' | 'notificationChannel'>> = {
  notificationDebounceMs: 500,
  enableNotifications: true,
  maxStreamEntries: 1000,
}
