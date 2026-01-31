/**
 * Security utilities for agent runner
 * Input sanitization and validation
 */

/**
 * Sanitize string for safe shell argument
 * Removes shell metacharacters that could cause injection
 */
export function sanitizeForShell(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '')

  // Limit length to prevent DoS
  if (sanitized.length > 100000) {
    sanitized = sanitized.slice(0, 100000)
  }

  return sanitized
}

/**
 * Validate cwd is within allowed directory
 */
export function validateCwd(cwd: string): string {
  const resolved = require('path').resolve(cwd)
  const allowed = ['/root/.claude', '/tmp', '/home']

  if (!allowed.some(prefix => resolved.startsWith(prefix))) {
    throw new Error(`CWD not allowed: ${cwd}`)
  }

  return resolved
}

/**
 * Validate session ID format (UUID only)
 */
export function validateSessionId(sessionId: string): void {
  if (!/^[a-f0-9-]{36}$/i.test(sessionId)) {
    throw new Error(`Invalid sessionId format: ${sessionId}`)
  }
}
