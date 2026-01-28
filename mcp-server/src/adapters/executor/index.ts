/**
 * Executor Adapter - Task Management
 *
 * Provides MCP tools for unified task execution:
 * - Submit tasks (skills, agents, workflows, scripts)
 * - Monitor task status and progress
 * - Cancel running tasks
 * - View execution statistics
 */

import { z } from 'zod';
import type { Adapter, AdapterTool } from '../../gateway/types.js';
import { createExecutor, getExecutor, formatDuration } from '@elio/executor';
import {
  submitSkillSchema,
  submitAgentSchema,
  submitWorkflowSchema,
  submitScriptSchema,
  taskIdSchema,
  listSchema,
  emptySchema,
} from './schemas.js';

const tools: AdapterTool[] = [
  {
    name: 'run_skill',
    description: 'Execute a skill (atomic operation) with optional arguments',
    type: 'write',
    schema: submitSkillSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof submitSkillSchema>;
      const executor = await createExecutor();
      const handle = await executor.submit({
        type: 'skill', name: p.name,
        params: { skillName: p.name, args: p.args },
        priority: p.priority, timeout: p.timeout,
      });
      return JSON.stringify({ success: true, taskId: handle.id, message: `Skill '${p.name}' submitted`, status: await handle.status() });
    },
  },
  {
    name: 'run_agent',
    description: 'Execute an agent task with a prompt via Claude CLI',
    type: 'write',
    schema: submitAgentSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof submitAgentSchema>;
      const executor = await createExecutor();
      const handle = await executor.submit({
        type: 'agent', name: p.name,
        params: { prompt: p.prompt, model: p.model },
        priority: p.priority, timeout: p.timeout,
      });
      return JSON.stringify({ success: true, taskId: handle.id, message: `Agent task '${p.name}' submitted`, status: await handle.status() });
    },
  },
  {
    name: 'run_workflow',
    description: 'Execute a multi-step workflow',
    type: 'write',
    schema: submitWorkflowSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof submitWorkflowSchema>;
      const executor = await createExecutor();
      const handle = await executor.submit({
        type: 'workflow', name: p.workflow,
        params: { workflowName: p.workflow, input: p.input },
        priority: p.priority,
      });
      return JSON.stringify({ success: true, taskId: handle.id, message: `Workflow '${p.workflow}' submitted`, status: await handle.status() });
    },
  },
  {
    name: 'run_script',
    description: 'Execute a standalone script (.ts, .js, .sh, .py)',
    type: 'write',
    schema: submitScriptSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof submitScriptSchema>;
      const executor = await createExecutor();
      const handle = await executor.submit({
        type: 'script', name: p.name,
        params: { scriptPath: p.scriptPath, args: p.args, cwd: p.cwd },
        priority: p.priority,
      });
      return JSON.stringify({ success: true, taskId: handle.id, message: `Script task '${p.name}' submitted`, status: await handle.status() });
    },
  },
  {
    name: 'task_status',
    description: 'Get status and progress of a specific task',
    type: 'read',
    schema: taskIdSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof taskIdSchema>;
      const executor = getExecutor();
      const status = await executor.getStatus(p.taskId);
      const result = await executor.getResult(p.taskId);
      return JSON.stringify({ taskId: p.taskId, status, result: result || undefined }, null, 2);
    },
  },
  {
    name: 'task_cancel',
    description: 'Cancel a running or pending task',
    type: 'write',
    schema: taskIdSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof taskIdSchema>;
      const executor = getExecutor();
      const cancelled = await executor.cancel(p.taskId);
      return JSON.stringify({ taskId: p.taskId, cancelled, message: cancelled ? 'Task cancelled' : 'Could not cancel task' });
    },
  },
  {
    name: 'task_logs',
    description: 'Get execution logs for a task',
    type: 'read',
    schema: taskIdSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof taskIdSchema>;
      const executor = getExecutor();
      const result = await executor.getResult(p.taskId);
      return JSON.stringify({ taskId: p.taskId, logs: result?.logs || [], status: result?.status }, null, 2);
    },
  },
  {
    name: 'task_list',
    description: 'List tasks with optional filtering',
    type: 'read',
    schema: listSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof listSchema>;
      const executor = getExecutor();
      const tasks = await executor.list({ status: p.status, type: p.type, limit: p.limit });
      return JSON.stringify({
        count: tasks.length,
        tasks: tasks.map(t => ({ id: t.id, type: t.task.type, name: t.task.name, status: t.status, priority: t.task.priority })),
      }, null, 2);
    },
  },
  {
    name: 'task_stats',
    description: 'Get execution statistics',
    type: 'read',
    schema: emptySchema,
    execute: async () => {
      const executor = getExecutor();
      const stats = await executor.getStats();
      return JSON.stringify({
        ...stats,
        avgDurationFormatted: formatDuration(stats.avgDuration),
        total: stats.pending + stats.running + stats.completed + stats.failed + stats.cancelled,
      }, null, 2);
    },
  },
];

export const executorAdapter: Adapter = {
  name: 'executor',
  isAuthenticated: () => true,
  tools,
};

export default executorAdapter;
