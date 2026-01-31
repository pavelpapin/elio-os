/**
 * Task Queue Service
 * Manages async tasks via BullMQ with Redis state tracking
 */

import { createLogger } from '@elio/shared';
import { submitAgentJob, getJobStatus } from './bullmq.js';

const logger = createLogger('telegram-bot:taskQueue');

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'timeout';

export interface Task {
  id: string;
  chatId: number;
  input: string;
  status: TaskStatus;
  workflowId: string;
  output?: string;
  error?: string;
  sessionId?: string;
  createdAt: string;
  completedAt?: string;
}

const activeTasks = new Map<number, Task>();
let onTaskComplete: ((task: Task) => void) | null = null;

export function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function addTask(chatId: number, input: string, sessionId?: string): Promise<Task> {
  const { workflowId } = await submitAgentJob(input, { sessionId, chatId });

  const task: Task = {
    id: generateTaskId(),
    chatId,
    input,
    status: 'running',
    workflowId,
    sessionId,
    createdAt: new Date().toISOString(),
  };

  activeTasks.set(chatId, task);
  logger.info('Task submitted to BullMQ', { taskId: task.id, workflowId });
  return task;
}

export async function getTask(id: string): Promise<Task | null> {
  for (const task of activeTasks.values()) {
    if (task.id === id) {
      try {
        const state = await getJobStatus(task.workflowId);
        task.status = mapStatus(state.status);
        if (state.sessionId) task.sessionId = state.sessionId;
        if (state.error) task.error = state.error;
      } catch { /* use cached */ }
      return task;
    }
  }
  return null;
}

export function getActiveTasks(chatId: number): Task[] {
  const task = activeTasks.get(chatId);
  return task ? [task] : [];
}

export function getQueueStatus(): { running: Task | null; queued: number; tasks: Task[] } {
  const tasks = Array.from(activeTasks.values());
  return {
    running: tasks.find(t => t.status === 'running') || null,
    queued: 0,
    tasks,
  };
}

export function setOnTaskComplete(callback: (task: Task) => void): void {
  onTaskComplete = callback;
}

export function completeTask(chatId: number, output: string, sessionId?: string): void {
  const task = activeTasks.get(chatId);
  if (task) {
    task.status = 'completed';
    task.output = output;
    task.completedAt = new Date().toISOString();
    if (sessionId) task.sessionId = sessionId;
    activeTasks.delete(chatId);
    if (onTaskComplete) onTaskComplete(task);
  }
}

export function cancelTask(id: string): boolean {
  for (const [chatId, task] of activeTasks.entries()) {
    if (task.id === id) {
      task.status = 'failed';
      task.error = 'Cancelled';
      task.completedAt = new Date().toISOString();
      activeTasks.delete(chatId);
      return true;
    }
  }
  return false;
}

function mapStatus(redisStatus: string): TaskStatus {
  switch (redisStatus) {
    case 'completed': return 'completed';
    case 'failed':
    case 'cancelled': return 'failed';
    case 'running': return 'running';
    case 'pending': return 'queued';
    default: return 'running';
  }
}
