/**
 * Job Manager Types
 * Type definitions and constants for job management system
 */

import type { Job } from '../types/index.js';

export type JobStatus = Job['status'];

export interface WorkflowState {
  status: string;
  progress?: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface JobUpdateCallback {
  (update: { type: string; content: string }): void;
}

export interface CreateJobParams {
  type: string;
  skill: string;
  inputs: Record<string, unknown>;
  requestedBy: string;
  priority?: number;
}

export interface WorkflowStartOptions {
  jobId: string;
  skill: string;
  inputs: Record<string, unknown>;
  cwd: string;
  entrypoint: string;
  timeout: number;
  requestedBy: string;
}

export interface RedisStateData {
  status?: string;
  startedAt?: string;
  completedAt?: string;
  progress?: string;
  error?: string;
}

// Status mapping helper
export function mapWorkflowStatusToJobStatus(status: string): JobStatus {
  switch (status) {
    case 'pending':
      return 'queued';
    case 'running':
    case 'awaiting_input':
      return 'running';
    case 'completed':
      return 'completed';
    case 'failed':
    case 'stalled':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'queued';
  }
}
