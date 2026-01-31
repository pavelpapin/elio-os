/**
 * File Logger - Backwards Compatibility Layer
 *
 * @deprecated Use createLogger from './logger.js' directly.
 * All logging now goes through the unified logger which always
 * writes to JSONL files.
 */

import { createLogger, LOG_PATHS, type LogLevel } from './logger.js'

export type { LogLevel }
export { LOG_PATHS }

/** @deprecated Use createLogger(ctx, runId) */
export function createFileLogger(ctx: string, runId?: string) {
  return createLogger(ctx, runId)
}

/** @deprecated Use createLogger(ctx, runId) */
export function setMinLevel(_level: LogLevel): void {}

/** @deprecated Use createLogger(ctx) */
export const fileLogger = {
  debug: (ctx: string, msg: string, data?: unknown) => createLogger(ctx).debug(msg, data),
  info: (ctx: string, msg: string, data?: unknown) => createLogger(ctx).info(msg, data),
  warn: (ctx: string, msg: string, data?: unknown) => createLogger(ctx).warn(msg, data),
  error: (ctx: string, msg: string, data?: unknown) => createLogger(ctx).error(msg, data),
  forRun: (ctx: string, runId: string) => createLogger(ctx, runId),
}
