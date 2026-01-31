/**
 * Workflows Manager
 * Run workflows via BullMQ queue
 */

import * as crypto from 'crypto'
import { subscribeToJob } from './jobs.js'

let workflowClientPromise: Promise<typeof import('@elio/workflow')> | null = null

async function getWorkflowModule() {
  if (!workflowClientPromise) {
    workflowClientPromise = import('@elio/workflow')
  }
  return workflowClientPromise
}

/** Known workflows that can be triggered via CLI */
const KNOWN_WORKFLOWS: Record<string, { description: string; params?: string[]; timeoutMs?: number }> = {
  'system-review': { description: 'Full system health review with auto-fix' },
  'deep-research': { description: 'Multi-agent deep research', params: ['topic'], timeoutMs: 3_600_000 },
  'data-enrichment': { description: 'Enrich data from sources', params: ['inputSource'] },
}

export function listWorkflows(): Array<{ name: string; description: string }> {
  return Object.entries(KNOWN_WORKFLOWS).map(([name, cfg]) => ({
    name,
    description: cfg.description,
  }))
}

/**
 * Submit workflow to BullMQ queue and stream output
 */
export async function runWorkflowWithStream(
  name: string,
  args: string[],
  onOutput: (update: { type: string; content: string }) => void,
): Promise<string> {
  const cfg = KNOWN_WORKFLOWS[name]
  if (!cfg) {
    throw new Error(`Unknown workflow: ${name}. Available: ${Object.keys(KNOWN_WORKFLOWS).join(', ')}`)
  }

  // Build params from positional args
  const params: Record<string, unknown> = { workflowName: name }
  if (cfg.params) {
    cfg.params.forEach((key, i) => {
      if (args[i]) params[key] = args[i]
    })
  }

  // Also parse key=value args
  for (const arg of args) {
    const eq = arg.indexOf('=')
    if (eq > 0) {
      params[arg.slice(0, eq)] = arg.slice(eq + 1)
    }
  }

  const workflowId = `${name}-${crypto.randomUUID().slice(0, 8)}`

  const workflow = await getWorkflowModule()
  const client = workflow.createWorkflowClient()

  await client.start('workflow-execution', {
    workflowId,
    workflowName: name,
    ...params,
  }, {
    workflowId,
  })

  onOutput({ type: 'progress', content: `Submitted ${name} to queue (${workflowId})` })

  // Stream output
  return new Promise((resolve, reject) => {
    const outputs: string[] = []
    const timeoutMs = cfg.timeoutMs || 600_000
    const timeout = setTimeout(() => {
      reject(new Error(`Workflow timeout after ${timeoutMs / 1000}s`))
    }, timeoutMs)

    client.subscribeToOutput(workflowId, (update) => {
      onOutput(update)

      if (update.type === 'output') {
        outputs.push(update.content)
      } else if (update.type === 'completed') {
        clearTimeout(timeout)
        resolve(outputs.join('\n'))
      } else if (update.type === 'error') {
        clearTimeout(timeout)
        reject(new Error(update.content))
      }
    }).catch(reject)
  })
}
