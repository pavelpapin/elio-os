/**
 * Agents Adapter
 * Allows starting and managing background agent workflows
 */

import { z } from 'zod'
import { createWorkflowClient, type BullMQWorkflowClient } from '@elio/workflow'
import type { Adapter, AdapterTool } from '../../gateway/types.js'
import { createLogger } from '../../utils/logger.js'

const logger = createLogger('agents')

// Lazy-initialized workflow client
let workflowClient: BullMQWorkflowClient | null = null
let redisAvailable = true

function getClient(): BullMQWorkflowClient {
  if (!workflowClient) {
    workflowClient = createWorkflowClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    })
  }
  return workflowClient
}

// Check if Redis is available
function isAuthenticated(): boolean {
  // Return true - Redis defaults to localhost:6379
  return redisAvailable
}

// Schemas
const startAgentSchema = z.object({
  prompt: z.string().describe('The prompt/task for the agent'),
  cwd: z.string().optional().describe('Working directory (default: /root/.claude)'),
  chatId: z.union([z.string(), z.number()]).optional().describe('Telegram chat ID for notifications'),
  sessionId: z.string().optional().describe('Resume existing session'),
})

const queryAgentSchema = z.object({
  workflowId: z.string().describe('The workflow ID to query'),
})

const signalAgentSchema = z.object({
  workflowId: z.string().describe('The workflow ID to signal'),
  signal: z.string().describe('Signal name (userInput, cancel, interrupt)'),
  data: z.unknown().optional().describe('Signal data'),
})

const listAgentsSchema = z.object({
  status: z.enum(['running', 'completed', 'failed', 'all']).optional().describe('Filter by status (default: running)'),
  limit: z.number().optional().describe('Max number of agents to return (default: 20)'),
})

const streamAgentSchema = z.object({
  workflowId: z.string().describe('The workflow ID to stream output from'),
  timeout: z.number().optional().describe('Max time to wait for output in seconds (default: 30)'),
})

const tools: AdapterTool[] = [
  {
    name: 'elio_agent_start',
    description: 'Start a background Claude agent to work on a task. Returns workflow ID for tracking.',
    type: 'write',
    schema: startAgentSchema,
    execute: async (params) => {
      const args = params as z.infer<typeof startAgentSchema>
      logger.info('Starting agent', { prompt: args.prompt.slice(0, 100) })

      try {
        const client = getClient()
        const handle = await client.start('agent-execution', {
          prompt: args.prompt,
          cwd: args.cwd || '/root/.claude',
          chatId: args.chatId,
          sessionId: args.sessionId,
        })

        logger.info('Agent started', { workflowId: handle.workflowId })

        return JSON.stringify({
          success: true,
          workflowId: handle.workflowId,
          message: `Agent started with ID: ${handle.workflowId}`,
        })
      } catch (error) {
        logger.error('Failed to start agent', { error })
        throw error
      }
    },
  },

  {
    name: 'elio_agent_status',
    description: 'Get the status of a running agent workflow',
    type: 'read',
    schema: queryAgentSchema,
    execute: async (params) => {
      const { workflowId } = params as z.infer<typeof queryAgentSchema>
      logger.info('Querying agent status', { workflowId })

      try {
        const client = getClient()
        const state = await client.query<{
          status: string
          startedAt?: number
          lastActivity?: number
          progress?: number
          error?: string
        }>(workflowId, 'status')

        return JSON.stringify({
          workflowId,
          ...state,
          startedAt: state.startedAt ? new Date(state.startedAt).toISOString() : undefined,
          lastActivity: state.lastActivity ? new Date(state.lastActivity).toISOString() : undefined,
        }, null, 2)
      } catch (error) {
        logger.error('Failed to query agent', { workflowId, error })
        throw error
      }
    },
  },

  {
    name: 'elio_agent_signal',
    description: 'Send a signal to a running agent (userInput, cancel, interrupt)',
    type: 'write',
    schema: signalAgentSchema,
    execute: async (params) => {
      const { workflowId, signal, data } = params as z.infer<typeof signalAgentSchema>
      logger.info('Sending signal to agent', { workflowId, signal })

      try {
        const client = getClient()
        await client.signal(workflowId, signal, data)

        return JSON.stringify({
          success: true,
          message: `Signal '${signal}' sent to ${workflowId}`,
        })
      } catch (error) {
        logger.error('Failed to signal agent', { workflowId, signal, error })
        throw error
      }
    },
  },

  {
    name: 'elio_agent_cancel',
    description: 'Cancel a running agent workflow',
    type: 'write',
    schema: queryAgentSchema,
    execute: async (params) => {
      const { workflowId } = params as z.infer<typeof queryAgentSchema>
      logger.info('Cancelling agent', { workflowId })

      try {
        const client = getClient()
        await client.cancel(workflowId)

        return JSON.stringify({
          success: true,
          message: `Agent ${workflowId} cancelled`,
        })
      } catch (error) {
        logger.error('Failed to cancel agent', { workflowId, error })
        throw error
      }
    },
  },

  {
    name: 'elio_agent_list',
    description: 'List recent agent workflows from system-loop state',
    type: 'read',
    schema: listAgentsSchema,
    execute: async (params) => {
      const args = params as z.infer<typeof listAgentsSchema>
      logger.info('Listing agents', { status: args.status, limit: args.limit })

      try {
        // Read from system-loop state file which tracks all workflow runs
        const fs = await import('fs')
        const stateFile = '/root/.claude/state/system-loop-state.json'

        if (!fs.existsSync(stateFile)) {
          return JSON.stringify({
            count: 0,
            agents: [],
            message: 'No system-loop state found',
          }, null, 2)
        }

        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'))
        const agents = Object.entries(state.items || {}).map(([id, item]: [string, unknown]) => {
          const i = item as { lastRun?: string; lastStatus?: string; workflowId?: string; duration?: number }
          return {
            id,
            workflowId: i.workflowId,
            lastRun: i.lastRun,
            status: i.lastStatus,
            duration: i.duration,
          }
        })

        return JSON.stringify({
          count: agents.length,
          agents,
          lastHeartbeat: state.lastHeartbeat,
        }, null, 2)
      } catch (error) {
        logger.error('Failed to list agents', { error })
        throw error
      }
    },
  },

  {
    name: 'elio_agent_stream',
    description: 'Subscribe to agent output stream and get recent output. Returns buffered output and current status.',
    type: 'read',
    schema: streamAgentSchema,
    execute: async (params) => {
      const args = params as z.infer<typeof streamAgentSchema>
      const timeout = (args.timeout || 30) * 1000
      logger.info('Streaming agent output', { workflowId: args.workflowId, timeout })

      try {
        const client = getClient()
        const outputs: Array<{ type: string; content: string; timestamp: string }> = []

        // Subscribe and collect output for timeout duration
        const unsubscribe = await client.subscribeToOutput(args.workflowId, (event) => {
          outputs.push({
            type: event.type,
            content: event.content,
            timestamp: new Date().toISOString(),
          })
        })

        // Wait for timeout or max 100 events
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (outputs.length >= 100) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 100)

          setTimeout(() => {
            clearInterval(checkInterval)
            resolve()
          }, Math.min(timeout, 5000)) // Max 5 seconds wait
        })

        unsubscribe()

        return JSON.stringify({
          workflowId: args.workflowId,
          outputCount: outputs.length,
          outputs: outputs.slice(-50), // Return last 50 events
        }, null, 2)
      } catch (error) {
        logger.error('Failed to stream agent output', { workflowId: args.workflowId, error })
        throw error
      }
    },
  },
]

export const agentsAdapter: Adapter = {
  name: 'agents',
  isAuthenticated,
  tools,
}
