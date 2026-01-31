/**
 * Auto-Fix: State Management & Circuit Breaker
 * Tracks fix attempts, prevents infinite retry loops
 */

import * as fs from 'fs'
import * as path from 'path'
import type { FailureClass } from './autofix-classify.js'

const STATE_FILE = '/root/.claude/state/autofix-state.json'
const MAX_ATTEMPTS = 3
const WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface FixAttempt {
  itemId: string
  strategy: string
  failureClass: FailureClass
  timestamp: string
  success: boolean
  details?: string
}

export interface FixState {
  attempts: FixAttempt[]
}

export function loadFixState(): FixState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
    }
  } catch { /* ignore */ }
  return { attempts: [] }
}

export function saveFixState(state: FixState): void {
  const dir = path.dirname(STATE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  // Prune old attempts beyond window
  const cutoff = Date.now() - WINDOW_MS
  state.attempts = state.attempts.filter(
    a => new Date(a.timestamp).getTime() > cutoff
  )

  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

export function shouldAttemptFix(state: FixState, itemId: string): boolean {
  const cutoff = Date.now() - WINDOW_MS
  const recent = state.attempts.filter(
    a => a.itemId === itemId && new Date(a.timestamp).getTime() > cutoff
  )
  return recent.length < MAX_ATTEMPTS
}

export function getRecentAttempts(state: FixState, itemId: string): FixAttempt[] {
  const cutoff = Date.now() - WINDOW_MS
  return state.attempts.filter(
    a => a.itemId === itemId && new Date(a.timestamp).getTime() > cutoff
  )
}
