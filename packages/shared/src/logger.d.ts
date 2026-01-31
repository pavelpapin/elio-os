/**
 * Structured Logger
 * Centralized logging with levels and context
 *
 * Usage:
 *   import { createLogger } from '@elio/shared'
 *   const logger = createLogger('MyModule')
 *   logger.info('message', { key: 'value' })
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export declare function setLevel(level: LogLevel): void;
export declare function setJsonOutput(enabled: boolean): void;
export declare function setFileLogging(enabled: boolean, dir?: string): void;
export interface Logger {
    debug: (msg: string, data?: unknown) => void;
    info: (msg: string, data?: unknown) => void;
    warn: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
    /** Create child logger with additional context */
    child: (childContext: string) => Logger;
}
/**
 * Create a logger with context
 */
export declare function createLogger(context: string): Logger;
/**
 * Default logger (no context)
 */
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map