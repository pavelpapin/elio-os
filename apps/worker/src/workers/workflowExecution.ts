/**
 * Workflow Execution Worker
 *
 * Uses dynamic workflow registry — workflows register themselves
 * via workflowMeta export instead of hardcoded switch/case.
 *
 * Adding a new workflow:
 *   1. Export `workflowMeta` and `execute()` from packages/{name}/src/index.ts
 *   2. Add import + registerWorkflow() call in registerAllWorkflows() below
 *   3. No other changes needed
 */

import { Worker, Job } from 'bullmq'
import {
  getBullMQConnection,
  createProgressReporter,
  type ProgressReporter,
  type ProgressAdapter,
  registerWorkflow,
  getWorkflow,
  getWorkflowStages,
  hasWorkflow,
} from '@elio/workflow'

export interface WorkflowExecutionParams {
  workflowId: string
  params: {
    workflowName: string
    chatId?: string | number
    [key: string]: unknown
  }
}

export interface WorkflowExecutionResult {
  status: 'completed' | 'failed' | 'paused_for_input'
  output?: unknown
}

const QUEUE_NAME = 'workflow-execution'

/**
 * Register all known workflows.
 * This is the ONLY place that needs updating when adding a new workflow.
 */
async function registerAllWorkflows(): Promise<void> {
  const deepResearch = await import('@elio/deep-research')
  registerWorkflow({
    workflowMeta: deepResearch.workflowMeta,
    execute: async (params, adapter) => {
      const result = await deepResearch.executeDeepResearch(
        {
          topic: (params.topic as string) ?? '',
          resumeRunId: params.resumeRunId as string | undefined,
          userInputPath: params.userInputPath as string | undefined,
        },
        adapter,
      )
      return {
        status: result.status === 'completed' ? 'completed' : result.status === 'paused_for_input' ? 'paused_for_input' : 'failed',
        output: result,
      }
    },
  })

  const dataEnrichment = await import('@elio/data-enrichment')
  registerWorkflow({
    workflowMeta: dataEnrichment.workflowMeta,
    execute: async (params, adapter) => {
      const result = await dataEnrichment.executeDataEnrichment(
        {
          inputSource: (params.inputSource as string) ?? '',
          resumeRunId: params.resumeRunId as string | undefined,
          userInputPath: params.userInputPath as string | undefined,
        },
        adapter,
      )
      return {
        status: result.status === 'completed' ? 'completed' : result.status === 'paused_for_input' ? 'paused_for_input' : 'failed',
        output: result,
      }
    },
  })

  const systemReview = await import('@elio/system-review')
  registerWorkflow({
    workflowMeta: systemReview.workflowMeta,
    execute: async (_params, adapter) => {
      const result = await systemReview.executeSystemReview(adapter)
      return {
        status: result.status === 'completed' ? 'completed' : 'failed',
        output: result,
      }
    },
  })
}

/**
 * Create workflow execution worker
 */
export async function createWorkflowExecutionWorker(
  config?: { host?: string; port?: number },
): Promise<Worker> {
  await registerAllWorkflows()

  const connection = getBullMQConnection(config)

  const worker = new Worker<WorkflowExecutionParams, WorkflowExecutionResult>(
    QUEUE_NAME,
    async (job) => processWorkflowJob(job),
    {
      connection,
      concurrency: 2,
      lockDuration: 300_000,
      lockRenewTime: 150_000,
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          return Math.min(5000 * Math.pow(2, attemptsMade - 1), 60000)
        },
      },
    },
  )

  worker.on('completed', (job) => {
    console.log(`[WorkflowWorker] Job completed: ${job.id}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[WorkflowWorker] Job failed: ${job?.id}`, err.message)
  })

  return worker
}

/**
 * Process a workflow job using the registry
 */
async function processWorkflowJob(
  job: Job<WorkflowExecutionParams>,
): Promise<WorkflowExecutionResult> {
  const { workflowId, params } = job.data
  const { workflowName } = params

  console.log(`[WorkflowWorker] Starting workflow: ${workflowName}`, { workflowId })

  const stages = getWorkflowStages(workflowName)
  const progress = createProgressReporter(workflowId, stages)
  const adapter = buildProgressAdapter(progress)

  try {
    if (!hasWorkflow(workflowName)) {
      await progress.fail(`Unknown workflow: ${workflowName}`)
      return { status: 'failed', output: { error: `Unknown workflow: ${workflowName}` } }
    }

    const workflow = getWorkflow(workflowName)!
    return await workflow.execute(params, adapter)
  } catch (err) {
    await progress.fail(String(err)).catch(() => {})
    throw err
  } finally {
    await progress.cleanup()
  }
}

/**
 * Build adapter from ProgressReporter to the ProgressAdapter interface
 */
function buildProgressAdapter(reporter: ProgressReporter): ProgressAdapter {
  return {
    start: (desc: string) => reporter.start(desc),
    startStage: (name: string, detail?: string) => reporter.startStage(name, detail),
    completeStage: (name: string, result?: string) => reporter.completeStage(name, result),
    failStage: (name: string, error: string) => reporter.failStage(name, error),
    log: (msg: string) => reporter.log(msg),
    complete: (result?: string) => reporter.complete(result),
    fail: (error: string) => reporter.fail(error),
    requestInput: (prompt: string) => reporter.requestInput(prompt),
    setMetadata: (key: string, value: unknown) => reporter.setMetadata(key, value),
  }
}
