/**
 * Dynamic Workflow Registry
 *
 * Convention-based workflow discovery. Each workflow package exports:
 *   - workflowMeta: { name, version, stages }
 *   - execute(params, adapter): Promise<WorkflowResult>
 *
 * Worker auto-discovers workflows instead of hardcoded switch/case.
 */

import type { ProgressAdapter } from './adapter.js'

export interface WorkflowMeta {
  name: string
  version: number
  stages: string[]
}

export interface WorkflowModule {
  workflowMeta: WorkflowMeta
  execute: (params: Record<string, unknown>, adapter: ProgressAdapter) => Promise<WorkflowResult>
}

export interface WorkflowResult {
  status: 'completed' | 'failed' | 'paused_for_input'
  output?: unknown
}

const workflows = new Map<string, WorkflowModule>()

/**
 * Register a workflow module
 */
export function registerWorkflow(mod: WorkflowModule): void {
  workflows.set(mod.workflowMeta.name, mod)
}

/**
 * Get a registered workflow by name
 */
export function getWorkflow(name: string): WorkflowModule | undefined {
  return workflows.get(name)
}

/**
 * Get all registered workflow names
 */
export function getRegisteredWorkflows(): string[] {
  return Array.from(workflows.keys())
}

/**
 * Get stages for a workflow
 */
export function getWorkflowStages(name: string): string[] {
  return workflows.get(name)?.workflowMeta.stages ?? ['execute']
}

/**
 * Check if a workflow is registered
 */
export function hasWorkflow(name: string): boolean {
  return workflows.has(name)
}
