/**
 * Executor Adapter - Zod Schemas
 */

import { z } from 'zod';

export const submitSkillSchema = z.object({
  name: z.string().describe('Skill name to execute'),
  args: z.array(z.string()).optional().describe('Arguments to pass to the skill'),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional().default('normal'),
  timeout: z.number().optional().describe('Timeout in milliseconds'),
});

export const submitAgentSchema = z.object({
  name: z.string().describe('Task name for reference'),
  prompt: z.string().describe('Prompt for the agent'),
  model: z.string().optional().describe('Model to use (default: claude-sonnet)'),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional().default('normal'),
  timeout: z.number().optional().describe('Timeout in milliseconds'),
});

export const submitWorkflowSchema = z.object({
  workflow: z.string().describe('Workflow name'),
  input: z.record(z.unknown()).optional().describe('Input data for workflow'),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional().default('normal'),
});

export const submitScriptSchema = z.object({
  name: z.string().describe('Task name for reference'),
  scriptPath: z.string().describe('Path to script'),
  args: z.array(z.string()).optional().describe('Script arguments'),
  cwd: z.string().optional().describe('Working directory'),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional().default('normal'),
});

export const taskIdSchema = z.object({
  taskId: z.string().describe('Task ID to operate on'),
});

export const listSchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'])
    .optional()
    .describe('Filter by status'),
  type: z.enum(['skill', 'agent', 'workflow', 'script'])
    .optional()
    .describe('Filter by task type'),
  limit: z.number().optional().default(20).describe('Max results'),
});

export const emptySchema = z.object({});
