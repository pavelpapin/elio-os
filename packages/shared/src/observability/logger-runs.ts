/**
 * Workflow Run Tracking
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { RunSummary, StageLog, WorkflowIssue, IssueType, IssueSeverity } from './logger-types.js';

const LOGS_DIR = '/root/.claude/logs/workflows';
const ISSUES_DIR = '/root/.claude/logs/issues';

// In-memory store for current runs
const activeRuns = new Map<string, RunSummary>();

function ensureDirs(): void {
  if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true });
  if (!existsSync(ISSUES_DIR)) mkdirSync(ISSUES_DIR, { recursive: true });
}

/**
 * Start tracking a new agent run
 */
export function startRun(workflowType: string, topic?: string): string {
  ensureDirs();
  const runId = `${workflowType}-${Date.now()}`;

  const summary: RunSummary = {
    runId,
    workflowType,
    startedAt: new Date().toISOString(),
    status: 'running',
    topic,
    stages: [],
    issues: [],
    metrics: {
      totalSources: 0,
      successfulSources: 0,
      failedSources: 0
    }
  };

  activeRuns.set(runId, summary);
  console.log(`[AgentLogger] Started run: ${runId}`);
  return runId;
}

/**
 * Log stage start
 */
export function startStage(runId: string, stage: string): void {
  const run = activeRuns.get(runId);
  if (!run) return;

  run.stages.push({
    stage,
    startedAt: new Date().toISOString(),
    status: 'running'
  });
}

/**
 * Log stage completion
 */
export function completeStage(
  runId: string,
  stage: string,
  status: 'completed' | 'failed' | 'skipped' = 'completed',
  details?: string
): void {
  const run = activeRuns.get(runId);
  if (!run) return;

  const stageLog = run.stages.find(s => s.stage === stage && s.status === 'running');
  if (stageLog) {
    stageLog.completedAt = new Date().toISOString();
    stageLog.status = status;
    stageLog.details = details;
  }
}

/**
 * Log successful data source
 */
export function logSourceSuccess(runId: string, source: string, recordCount?: number): void {
  const run = activeRuns.get(runId);
  if (run) {
    run.metrics.totalSources++;
    run.metrics.successfulSources++;
  }
  console.log(`[AgentLogger] Source OK: ${source}${recordCount ? ` (${recordCount} records)` : ''}`);
}

/**
 * Complete the run and save summary
 */
export function completeRun(
  runId: string,
  status: 'completed' | 'failed' | 'partial' = 'completed',
  deliverable?: RunSummary['deliverable']
): RunSummary | null {
  const run = activeRuns.get(runId);
  if (!run) return null;

  run.completedAt = new Date().toISOString();
  run.status = status;
  run.deliverable = deliverable;

  // Calculate quality score
  if (run.metrics.totalSources > 0) {
    run.metrics.dataQualityScore =
      run.metrics.successfulSources / run.metrics.totalSources;
  }

  // Calculate verification rate (issues with verification_failed)
  const verificationIssues = run.issues.filter(i => i.issueType === 'verification_failed').length;
  const totalFacts = run.metrics.successfulSources * 3; // rough estimate
  if (totalFacts > 0) {
    run.metrics.verificationRate = 1 - (verificationIssues / totalFacts);
  }

  // Save to file
  const runFile = join(LOGS_DIR, `${runId}.json`);
  writeFileSync(runFile, JSON.stringify(run, null, 2));

  // Remove from active
  activeRuns.delete(runId);

  console.log(`[AgentLogger] Run completed: ${runId} (${status})`);
  console.log(`[AgentLogger] Issues: ${run.issues.length}, Sources: ${run.metrics.successfulSources}/${run.metrics.totalSources}`);

  return run;
}

/**
 * Get current run summary (for progress display)
 */
export function getRunSummary(runId: string): RunSummary | null {
  return activeRuns.get(runId) || null;
}

// Re-export for logger-issues.ts
export { activeRuns, ensureDirs };
