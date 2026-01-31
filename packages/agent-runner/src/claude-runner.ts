/**
 * Claude Code agent runner factory
 * Creates AgentRunner configured for Claude CLI
 */

import { AgentRunner } from './AgentRunner.js'
import { sanitizeForShell, validateCwd, validateSessionId } from './security.js'
import { parseClaudeOutput } from './claude-parser.js'
import type { AgentRunOptions } from './types.js'

/**
 * Build command line arguments for Claude CLI
 */
function buildClaudeArgs(options: AgentRunOptions): string[] {
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
    validateSessionId(options.sessionId)
    args.push('--resume', options.sessionId)
  }

  // Prompt is the last argument
  args.push(prompt)

  return args
}

/**
 * Create Claude Code agent runner
 */
export function createClaudeRunner(): AgentRunner {
  return new AgentRunner({
    name: 'claude',
    command: 'claude',
    buildArgs: buildClaudeArgs,
    parseOutput: parseClaudeOutput,
  })
}
