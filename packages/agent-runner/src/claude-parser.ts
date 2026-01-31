/**
 * Claude Code output parser
 * Maps Claude CLI JSON format to StreamUpdate format
 */

import type { StreamUpdateWithSession } from '@elio/workflow'

/**
 * Helper to extract text from Claude message content
 */
function extractContent(content: unknown): string {
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

/**
 * Parse Claude Code JSON output line to StreamUpdate
 */
export function parseClaudeOutput(line: string): StreamUpdateWithSession | null {
  try {
    const data = JSON.parse(line)

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
}
