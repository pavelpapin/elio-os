/**
 * Job Manager
 * Async task queue via BullMQ (no direct spawn)
 */

import * as crypto from 'crypto'
import type { Job, SkillConfig } from '../types/index.js'
import { SKILLS_DIR } from '../utils/paths.js'
import { readJson } from '../utils/fs.js'
import * as path from 'path'

// Lazy load workflow client to avoid circular deps
let workflowClientPromise: Promise<typeof import('@elio/workflow')> | null = null

async function getWorkflowModule() {
  if (!workflowClientPromise) {
    workflowClientPromise = import('@elio/workflow')
  }
  return workflowClientPromise
}

function generateId(): string {
  return crypto.randomUUID()
}

// In-memory job tracking (for CLI compatibility)
const jobRegistry = new Map<string, Job>()

/**
 * Create a job and submit to BullMQ queue
 */
export async function createJob(
  type: string,
  skill: string,
  inputs: Record<string, unknown>,
  requestedBy: string,
  priority = 1
): Promise<Job> {
  const skillPath = path.join(SKILLS_DIR, skill, 'skill.json')
  const skillConfig = readJson<SkillConfig>(skillPath)

  if (!skillConfig) {
    throw new Error(`Skill not found: ${skill}`)
  }

  const jobId = generateId()

  const job: Job = {
    id: jobId,
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    status: 'queued',
    type,
    skill,
    inputs,
    progress: 0,
    logs: [{ timestamp: new Date().toISOString(), message: 'Job created' }],
    result: null,
    error: null,
    requested_by: requestedBy,
    priority,
    timeout: skillConfig.timeout || 600,
  }

  // Store locally for status tracking
  jobRegistry.set(jobId, job)

  // Submit to BullMQ queue
  const workflow = await getWorkflowModule()
  const client = workflow.createWorkflowClient()

  await client.start('skill-execution', {
    jobId,
    skill,
    inputs,
    cwd: path.join(SKILLS_DIR, skill),
    entrypoint: skillConfig.entrypoint,
    timeout: job.timeout,
    requestedBy,
  }, {
    workflowId: `skill-${jobId}`,
  })

  job.logs.push({ timestamp: new Date().toISOString(), message: 'Submitted to BullMQ queue' })

  return job
}

/**
 * Load job status (from registry or Redis)
 */
export async function loadJob(id: string): Promise<Job | null> {
  // Check local registry first
  const local = jobRegistry.get(id)
  if (local) {
    // Try to get updated status from Redis
    try {
      const workflow = await getWorkflowModule()
      const client = workflow.createWorkflowClient()
      const state = await client.query<{ status: string; progress?: number; error?: string }>(
        `skill-${id}`,
        'status'
      )

      if (state.status) {
        local.status = mapStatus(state.status)
        if (state.progress !== undefined) local.progress = state.progress
        if (state.error) local.error = state.error
      }
    } catch {
      // Workflow might not exist yet, use local state
    }

    return local
  }

  // Try to load from Redis state
  try {
    const workflow = await getWorkflowModule()
    const redis = workflow.getStateConnection()
    const stateKey = workflow.REDIS_KEYS.workflowState(`skill-${id}`)
    const state = await redis.hgetall(stateKey)

    if (state && state.status) {
      return {
        id,
        created_at: new Date(parseInt(state.startedAt || '0', 10)).toISOString(),
        started_at: state.startedAt ? new Date(parseInt(state.startedAt, 10)).toISOString() : null,
        completed_at: state.completedAt ? new Date(parseInt(state.completedAt, 10)).toISOString() : null,
        status: mapStatus(state.status),
        type: 'skill',
        skill: 'unknown',
        inputs: {},
        progress: parseInt(state.progress || '0', 10),
        logs: [],
        result: null,
        error: state.error || null,
        requested_by: 'unknown',
        priority: 1,
        timeout: 600,
      }
    }
  } catch {
    // Redis not available
  }

  return null
}

/**
 * Run a job by ID (triggers BullMQ processing if not already running)
 */
export async function runJob(id: string): Promise<Job | null> {
  const job = await loadJob(id)
  if (!job) {
    console.error(`[Jobs] Job not found: ${id}`)
    return null
  }

  if (job.status === 'running') {
    console.log(`[Jobs] Job already running: ${id}`)
    return job
  }

  if (job.status === 'completed' || job.status === 'failed') {
    console.log(`[Jobs] Job already finished: ${id} (${job.status})`)
    return job
  }

  // Job should already be in queue from createJob
  // If we need to re-run, we signal it
  const workflow = await getWorkflowModule()
  const client = workflow.createWorkflowClient()

  try {
    await client.signal(`skill-${id}`, 'resume')
  } catch {
    // Workflow might not support resume, ignore
  }

  return job
}

/**
 * Get queued jobs (pending in BullMQ)
 */
export async function getQueuedJobs(): Promise<Job[]> {
  const queued: Job[] = []

  for (const job of jobRegistry.values()) {
    if (job.status === 'queued') {
      queued.push(job)
    }
  }

  return queued.sort((a, b) => b.priority - a.priority)
}

/**
 * Get active jobs (running in BullMQ)
 */
export async function getActiveJobs(): Promise<Job[]> {
  const active: Job[] = []

  for (const job of jobRegistry.values()) {
    if (job.status === 'running') {
      active.push(job)
    }
  }

  return active
}

/**
 * Subscribe to job output stream
 */
export async function subscribeToJob(
  id: string,
  callback: (update: { type: string; content: string }) => void
): Promise<() => void> {
  const workflow = await getWorkflowModule()
  const client = workflow.createWorkflowClient()

  return client.subscribeToOutput(`skill-${id}`, (update) => {
    callback({ type: update.type, content: update.content })

    // Update local job status
    const job = jobRegistry.get(id)
    if (job) {
      if (update.type === 'completed') {
        job.status = 'completed'
        job.progress = 100
        job.completed_at = new Date().toISOString()
      } else if (update.type === 'error') {
        job.status = 'failed'
        job.error = update.content
        job.completed_at = new Date().toISOString()
      } else if (update.type === 'progress') {
        job.status = 'running'
        job.logs.push({ timestamp: new Date().toISOString(), message: update.content })
      }
    }
  })
}

/**
 * Cancel a running job
 */
export async function cancelJob(id: string): Promise<boolean> {
  const workflow = await getWorkflowModule()
  const client = workflow.createWorkflowClient()

  try {
    await client.cancel(`skill-${id}`)

    const job = jobRegistry.get(id)
    if (job) {
      job.status = 'cancelled'
      job.completed_at = new Date().toISOString()
    }

    return true
  } catch (error) {
    console.error(`[Jobs] Failed to cancel job ${id}:`, error)
    return false
  }
}

// Helper to map workflow status to job status
function mapStatus(status: string): Job['status'] {
  switch (status) {
    case 'pending':
      return 'queued'
    case 'running':
    case 'awaiting_input':
      return 'running'
    case 'completed':
      return 'completed'
    case 'failed':
    case 'stalled':
      return 'failed'
    case 'cancelled':
      return 'cancelled'
    default:
      return 'queued'
  }
}
