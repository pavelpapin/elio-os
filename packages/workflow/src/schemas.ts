/**
 * Zod schemas for BullMQ job payloads
 *
 * Runtime validation at package boundaries — when data crosses
 * from BullMQ queue to workflow executor, validate the shape.
 */

import { z } from 'zod'

/**
 * Base workflow execution params — all workflows receive this
 */
export const WorkflowJobSchema = z.object({
  workflowId: z.string().min(1),
  params: z.object({
    workflowName: z.string().min(1),
    chatId: z.union([z.string(), z.number()]).optional(),
  }).passthrough(), // Allow workflow-specific params
})

export type WorkflowJobData = z.infer<typeof WorkflowJobSchema>

/**
 * Deep research specific params
 */
export const DeepResearchParamsSchema = z.object({
  workflowName: z.literal('deep-research'),
  topic: z.string().min(1),
  resumeRunId: z.string().optional(),
  userInputPath: z.string().optional(),
  chatId: z.union([z.string(), z.number()]).optional(),
})

/**
 * System review specific params (no extra params needed)
 */
export const SystemReviewParamsSchema = z.object({
  workflowName: z.literal('system-review'),
  chatId: z.union([z.string(), z.number()]).optional(),
})

/**
 * Agent execution params
 */
export const AgentJobSchema = z.object({
  workflowId: z.string().min(1),
  params: z.object({
    agentId: z.string().min(1),
    prompt: z.string().min(1),
    config: z.object({
      repo: z.string().optional(),
    }).optional(),
  }),
})

export type AgentJobData = z.infer<typeof AgentJobSchema>

/**
 * Scheduled task params
 */
export const ScheduledTaskSchema = z.object({
  workflowId: z.string().min(1),
  params: z.object({
    chatId: z.number(),
    type: z.enum(['reminder', 'agent_trigger', 'workflow', 'notification']),
    message: z.string().optional(),
    agentName: z.string().optional(),
    agentInput: z.string().optional(),
    notifyTelegram: z.boolean().optional(),
  }),
})

export type ScheduledTaskData = z.infer<typeof ScheduledTaskSchema>

/**
 * Validate job data at queue boundary.
 * Call this in the worker before processing.
 */
export function validateJobData<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data)
}
