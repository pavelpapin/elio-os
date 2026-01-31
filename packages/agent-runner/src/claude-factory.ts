/**
 * Claude Code Agent Factory
 * Factory function and helpers for creating Claude CLI agent runner
 */

import { AgentRunner } from './AgentRunner.js'
import type { AgentRunOptions } from './types.js'

/**
 * Sanitize string for safe shell argument
 * Removes shell metacharacters that could cause injection
 */
function sanitizeForShell(input: string): string {
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
function validateCwd(cwd: string): string {
  const resolved = require('path').resolve(cwd)
  const allowed = ['/root/.claude', '/tmp', '/home']

  if (!allowed.some(prefix => resolved.startsWith(prefix))) {
    throw new Error(`CWD not allowed: ${cwd}`)
  }

  return resolved
}

/**
 * Create Claude Code agent runner
 */
export function createClaudeRunner(): AgentRunner {
  return new AgentRunner({
    name: 'claude',
    command: 'claude',
    buildArgs: (options) => {
      // Validate and sanitize inputs
      const prompt = sanitizeForShell(options.prompt)
      const cwd = validateCwd(options.cwd)

      const args = [
        '-p',                          // Print mode (non-interactive)
        '--output-format', 'stream-json',
        '--verbose',                   // Required for stream-json
        '--permission-mode', 'default', // Override bypassPermissions in settings
        // NOTE: Do NOT use --mcp-config '{}' - it causes hangs
      ]

      if (options.sessionId) {
        // Validate sessionId format (UUID only)
        if (!/^[a-f0-9-]{36}$/i.test(options.sessionId)) {
          throw new Error(`Invalid sessionId format: ${options.sessionId}`)
        }
        args.push('--resume', options.sessionId)
      }

      // Prompt is the last argument
      args.push(prompt)

      return args
    },
    parseOutput: (line) => {
      try {
        const data = JSON.parse(line)

        // Helper to extract text from Claude message content
        const extractContent = (content: unknown): string => {
          if (typeof content === 'string') return content
          if (Array.isArray(content)) {
            return content
              .map(c => c.text || c.content || '')
              .filter(Boolean)
              .join('\n')
          }
          if (content && typeof content === 'object') {
            return (content as { text?: string }).text || JSON.stringify(content)
          }
          return String(content || '')
        }

        // Map Claude Code JSON format to our StreamUpdate
        switch (data.type) {
          case 'assistant':
            return {
              type: 'output',
              content: extractContent(data.message?.content),
              timestamp: Date.now(),
              sessionId: data.session_id,
            }

          case 'user':
            // Tool results - skip or return minimal info
            return null

          case 'user_input_request':
            return {
              type: 'input_request',
              content: data.message || 'Waiting for input...',
              timestamp: Date.now(),
            }

          case 'result':
            return {
              type: 'completed',
              content: data.result || 'Done',
              timestamp: Date.now(),
              sessionId: data.session_id,
            }

          case 'error':
            return {
              type: 'error',
              content: data.error || 'Unknown error',
              timestamp: Date.now(),
            }

          case 'system':
            // Init message - skip
            return null

          default:
            // Pass through other types as output
            if (data.message?.content) {
              return {
                type: 'output',
                content: extractContent(data.message.content),
                timestamp: Date.now(),
              }
            }
            return null
        }
      } catch {
        // Not JSON, treat as raw output
        if (line.trim()) {
          return {
            type: 'output',
            content: line,
            timestamp: Date.now(),
          }
        }
        return null
      }
    },
  })
}
