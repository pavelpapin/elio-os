/**
 * Process Handle - Types and Constants
 */

export type ProcessState = 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error'

export interface ProcessOptions {
  command: string
  args: string[]
  cwd: string
  timeoutMs?: number
  signal?: AbortSignal
  env?: Record<string, string>
}

export interface ProcessCallbacks {
  onStdoutLine: (line: string) => void
  onStderrLine?: (line: string) => void
  onClose: (code: number | null, error: Error | null) => void
}

export const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
