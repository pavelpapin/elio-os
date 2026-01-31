/**
 * Job Manager Utilities
 * Helper functions for job management
 */

import type { Job, SkillConfig } from '../types/index.js';
import { mapWorkflowStatusToJobStatus } from './job-types.js';

// In-memory job tracking (for CLI compatibility)
const jobRegistry = new Map<string, Job>();

export function registerJob(id: string, job: Job): void {
  jobRegistry.set(id, job);
}

export function getRegisteredJob(id: string): Job | undefined {
  return jobRegistry.get(id);
}

export function getAllRegisteredJobs(): IterableIterator<Job> {
  return jobRegistry.values();
}

export function updateJobInRegistry(id: string, updates: Partial<Job>): void {
  const job = jobRegistry.get(id);
  if (job) {
    Object.assign(job, updates);
  }
}

export async function loadJobFromRedis(
  workflowModule: typeof import('@elio/workflow'),
  id: string
): Promise<Job | null> {
  try {
    const redis = workflowModule.getStateConnection();
    const stateKey = workflowModule.REDIS_KEYS.workflowState(`skill-${id}`);
    const state = await redis.hgetall(stateKey);

    if (state && state.status) {
      return {
        id,
        created_at: new Date(parseInt(state.startedAt || '0', 10)).toISOString(),
        started_at: state.startedAt ? new Date(parseInt(state.startedAt, 10)).toISOString() : null,
        completed_at: state.completedAt ? new Date(parseInt(state.completedAt, 10)).toISOString() : null,
        status: mapWorkflowStatusToJobStatus(state.status),
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
      };
    }
  } catch {
    // Redis not available
  }

  return null;
}

export async function updateJobFromWorkflow(
  workflowModule: typeof import('@elio/workflow'),
  id: string,
  job: Job
): Promise<void> {
  try {
    const client = workflowModule.createWorkflowClient();
    const state = await client.query<{ status: string; progress?: number; error?: string }>(
      `skill-${id}`,
      'status'
    );

    if (state.status) {
      job.status = mapWorkflowStatusToJobStatus(state.status);
      if (state.progress !== undefined) job.progress = state.progress;
      if (state.error) job.error = state.error;
    }
  } catch {
    // Workflow might not exist yet, use local state
  }
}

export function createJobObject(
  jobId: string,
  type: string,
  skill: string,
  inputs: Record<string, unknown>,
  requestedBy: string,
  priority: number,
  skillConfig: SkillConfig
): Job {
  return {
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
  };
}
