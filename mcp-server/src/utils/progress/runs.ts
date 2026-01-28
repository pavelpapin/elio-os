/**
 * Run Management
 */

import { fileLogger } from '../file-logger.js';
import { sendTelegram } from './telegram.js';
import type { RunProgress } from './types.js';

const activeRuns = new Map<string, RunProgress>();

export function getActiveRuns(): Map<string, RunProgress> {
  return activeRuns;
}

export async function startRun(runId: string, task: string, stages: string[]): Promise<void> {
  const progress: RunProgress = {
    runId, task,
    stages: stages.map((name, i) => ({ name, percent: Math.round(((i + 1) / stages.length) * 100) })),
    currentStage: 0, status: 'running', startedAt: new Date()
  };
  activeRuns.set(runId, progress);
  fileLogger.info('progress', `Run started: ${runId}`, { task, stages });
  await sendTelegram(`🚀 <b>Started:</b> ${task}\n📋 Stages: ${stages.length}\n🆔 Run: <code>${runId}</code>`);
}

export async function updateStage(runId: string, stageName: string, details?: string): Promise<void> {
  const run = activeRuns.get(runId);
  if (!run) { fileLogger.warn('progress', `Unknown run: ${runId}`); return; }

  const stageIndex = run.stages.findIndex(s => s.name === stageName);
  if (stageIndex === -1) {
    run.stages.push({ name: stageName, percent: 0 });
    run.currentStage = run.stages.length - 1;
  } else {
    run.currentStage = stageIndex;
  }

  const stage = run.stages[run.currentStage];
  fileLogger.info('progress', `Stage: ${stageName}`, { runId });
  await sendTelegram(`📋 <b>${run.currentStage + 1}/${run.stages.length}</b> ${stageName} (${stage.percent}%)\n${details ? `└ ${details}` : ''}`);
}

export async function reportSubstep(runId: string, message: string): Promise<void> {
  if (!activeRuns.has(runId)) return;
  fileLogger.debug('progress', message, { runId });
}

export async function completeRun(runId: string, result: RunProgress['result']): Promise<void> {
  const run = activeRuns.get(runId);
  if (!run) { fileLogger.warn('progress', `Unknown run: ${runId}`); return; }

  run.status = 'completed'; run.result = result;
  const duration = Math.round((Date.now() - run.startedAt.getTime()) / 1000);
  fileLogger.info('progress', `Run completed: ${runId}`, { duration, result });

  let resultText = result?.url ? `\n🔗 ${result.url}` : result?.path ? `\n📁 ${result.path}` : '';
  await sendTelegram(`✅ <b>Completed:</b> ${run.task}\n⏱ ${Math.floor(duration / 60)}m ${duration % 60}s${resultText}`);
  activeRuns.delete(runId);
}

export async function failRun(runId: string, error: string): Promise<void> {
  const run = activeRuns.get(runId);
  if (!run) { fileLogger.warn('progress', `Unknown run: ${runId}`); return; }

  run.status = 'failed'; run.error = error;
  fileLogger.error('progress', `Run failed: ${runId}`, { error });
  await sendTelegram(`❌ <b>Failed:</b> ${run.task}\n🆔 <code>${runId}</code>\n⚠️ ${error}`);
  activeRuns.delete(runId);
}

export function getProgress(runId: string): RunProgress | undefined {
  return activeRuns.get(runId);
}

export function listActiveRuns(): RunProgress[] {
  return Array.from(activeRuns.values());
}

export function generateRunId(prefix: string = 'run'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}
