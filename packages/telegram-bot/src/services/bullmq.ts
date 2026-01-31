/**
 * BullMQ Service
 * Submits jobs to BullMQ queues and subscribes to output streams
 */

import { createWorkflowClient, type WorkflowClient, type StreamUpdate } from '@elio/workflow';
import { createLogger } from '@elio/shared';

const logger = createLogger('telegram-bot:bullmq');

let client: WorkflowClient | null = null;

function getClient(): WorkflowClient {
  if (!client) {
    client = createWorkflowClient();
  }
  return client;
}

export interface AgentJobResult {
  workflowId: string;
}

export interface SkillJobResult {
  workflowId: string;
}

/**
 * Submit a Claude agent job to BullMQ
 */
export async function submitAgentJob(
  prompt: string,
  options?: { sessionId?: string; chatId?: number }
): Promise<AgentJobResult> {
  const c = getClient();
  const handle = await c.start('agent-execution', {
    prompt,
    cwd: '/root/.claude',
    sessionId: options?.sessionId,
    chatId: options?.chatId,
  });

  logger.info('Agent job submitted', { workflowId: handle.workflowId });
  return { workflowId: handle.workflowId };
}

/**
 * Submit a skill job to BullMQ
 */
export async function submitSkillJob(
  skill: string,
  args: string[]
): Promise<SkillJobResult> {
  const c = getClient();
  const handle = await c.start('skill-execution', {
    skill,
    inputs: args,
    cwd: `/root/.claude/skills/${skill}`,
    requestedBy: 'telegram-bot',
  });

  logger.info('Skill job submitted', { workflowId: handle.workflowId, skill });
  return { workflowId: handle.workflowId };
}

/**
 * Subscribe to job output stream.
 * Calls onUpdate for each stream update, onComplete when done.
 * Returns unsubscribe function.
 */
export async function subscribeToJob(
  workflowId: string,
  onUpdate: (text: string) => void,
  onComplete: (finalText: string) => void,
  onError: (error: string) => void
): Promise<() => void> {
  const c = getClient();
  let fullOutput = '';

  const unsubscribe = await c.subscribeToOutput(workflowId, async (update: StreamUpdate) => {
    if (update.type === 'output' || update.type === 'text') {
      fullOutput += update.content;
      onUpdate(fullOutput);
    } else if (update.type === 'completed') {
      onComplete(fullOutput || update.content);
    } else if (update.type === 'error') {
      onError(update.content);
    }
  });

  return unsubscribe;
}

/**
 * Query job status from Redis state
 */
export async function getJobStatus(workflowId: string): Promise<{
  status: string;
  error?: string;
  sessionId?: string;
}> {
  const c = getClient();
  const state = await c.query<{
    status: string;
    error?: string;
    sessionId?: string;
  }>(workflowId, 'status');
  return state;
}

/**
 * Cleanup client connections
 */
export async function closeBullMQ(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}
