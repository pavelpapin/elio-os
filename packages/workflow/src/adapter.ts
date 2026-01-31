/**
 * Canonical ProgressAdapter interface
 *
 * Single source of truth — workflows import this instead of
 * defining their own duplicate interfaces.
 */

export interface ProgressAdapter {
  start(description: string): Promise<void>
  startStage(name: string, detail?: string): Promise<void>
  completeStage(name: string, result?: string): Promise<void>
  failStage(name: string, error: string): Promise<void>
  log(message: string): Promise<void>
  complete(result?: string): Promise<void>
  fail(error: string): Promise<void>
  requestInput(prompt: string): Promise<void>
  setMetadata(key: string, value: unknown): Promise<void>
}
