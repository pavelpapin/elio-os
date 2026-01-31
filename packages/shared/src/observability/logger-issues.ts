/**
 * Issue Logging and Retrieval
 */

import { appendFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { WorkflowIssue, IssueType, IssueSeverity } from './logger-types.js';
import { activeRuns, ensureDirs } from './logger-runs.js';

const ISSUES_DIR = '/root/.claude/logs/issues';

/**
 * Log an issue (the main function)
 */
export function logIssue(
  runId: string,
  issueType: IssueType,
  message: string,
  context: WorkflowIssue['context'] = {},
  severity: IssueSeverity = 'warning'
): void {
  const run = activeRuns.get(runId);
  const currentStage = run?.stages.find(s => s.status === 'running')?.stage || 'unknown';

  const issue: WorkflowIssue = {
    timestamp: new Date().toISOString(),
    runId,
    workflowType: run?.workflowType || 'unknown',
    stage: currentStage,
    issueType,
    severity,
    message,
    context
  };

  // Add to run summary
  if (run) {
    run.issues.push(issue);

    // Update metrics
    if (issueType === 'data_source_failed' || issueType === 'data_source_blocked') {
      run.metrics.failedSources++;
    }
  }

  // Also append to daily issues log
  const today = new Date().toISOString().split('T')[0];
  const issuesFile = join(ISSUES_DIR, `${today}.jsonl`);
  appendFileSync(issuesFile, JSON.stringify(issue) + '\n');

  // Console log for visibility
  const emoji = severity === 'critical' ? '🔴' :
                severity === 'error' ? '🟠' :
                severity === 'warning' ? '🟡' : '🔵';
  console.log(`${emoji} [${issueType}] ${message}`);
}

/**
 * Get issues from today
 */
export function getTodayIssues(): WorkflowIssue[] {
  ensureDirs();
  const today = new Date().toISOString().split('T')[0];
  const issuesFile = join(ISSUES_DIR, `${today}.jsonl`);

  if (!existsSync(issuesFile)) return [];

  return readFileSync(issuesFile, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line) as WorkflowIssue);
}

/**
 * Get issues from last N days
 */
export function getRecentIssues(days: number = 7): WorkflowIssue[] {
  ensureDirs();
  const issues: WorkflowIssue[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const issuesFile = join(ISSUES_DIR, `${dateStr}.jsonl`);

    if (existsSync(issuesFile)) {
      const dayIssues = readFileSync(issuesFile, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line) as WorkflowIssue);
      issues.push(...dayIssues);
    }
  }

  return issues;
}
