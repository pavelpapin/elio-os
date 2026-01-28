/**
 * Heartbeat System
 */

import { fileLogger } from '../file-logger.js';
import { sendTelegram } from './telegram.js';
import { getActiveRuns, startRun, completeRun, failRun } from './runs.js';
import type { RunProgress } from './types.js';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const heartbeatTimers = new Map<string, NodeJS.Timeout>();

export function startHeartbeat(runId: string, taskName: string, intervalMs = HEARTBEAT_INTERVAL_MS): () => void {
  stopHeartbeat(runId);
  const startTime = Date.now();
  let lastMessage = '';

  const timer = setInterval(async () => {
    const run = getActiveRuns().get(runId);
    const elapsedMin = Math.floor((Date.now() - startTime) / 60000);
    const statusText = run?.stages[run.currentStage]?.name || 'Working...';
    const message = `⏳ <b>${taskName}</b> (${elapsedMin}m elapsed)\n└ ${statusText}`;

    if (message !== lastMessage) {
      lastMessage = message;
      await sendTelegram(message);
      fileLogger.debug('progress', `Heartbeat: ${runId}`, { elapsedMin });
    }
  }, intervalMs);

  heartbeatTimers.set(runId, timer);
  return () => stopHeartbeat(runId);
}

export function stopHeartbeat(runId: string): void {
  const timer = heartbeatTimers.get(runId);
  if (timer) { clearInterval(timer); heartbeatTimers.delete(runId); }
}

export async function withHeartbeat<T>(
  runId: string,
  taskName: string,
  fn: (sendUpdate: (msg: string) => Promise<void>) => Promise<T>,
  intervalMs = HEARTBEAT_INTERVAL_MS
): Promise<T> {
  const stop = startHeartbeat(runId, taskName, intervalMs);
  const sendUpdate = async (msg: string) => { await sendTelegram(`📊 <b>${taskName}</b>\n└ ${msg}`); };
  try { return await fn(sendUpdate); }
  finally { stop(); }
}

export async function startRunWithHeartbeat(runId: string, task: string, stages: string[], enable = true): Promise<void> {
  await startRun(runId, task, stages);
  if (enable) startHeartbeat(runId, task);
}

export async function completeRunWithHeartbeat(runId: string, result: RunProgress['result']): Promise<void> {
  stopHeartbeat(runId);
  await completeRun(runId, result);
}

export async function failRunWithHeartbeat(runId: string, error: string): Promise<void> {
  stopHeartbeat(runId);
  await failRun(runId, error);
}
