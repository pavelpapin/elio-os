/**
 * Analysis Report Generation and Querying
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { AnalysisReport, ImprovementTask } from './analyzer-types.js';
import type { RunSummary } from './logger-types.js';
import { aggregateIssues, generateImprovementSuggestions } from './logger-analysis.js';
import {
  generateImprovementTasks,
  identifyNightlyTasks,
  saveImprovementTask,
  getPendingTasks
} from './analyzer-tasks.js';

const IMPROVEMENTS_DIR = '/root/.claude/logs/improvements';

function ensureDir(): void {
  if (!existsSync(IMPROVEMENTS_DIR)) {
    mkdirSync(IMPROVEMENTS_DIR, { recursive: true });
  }
}

/**
 * Analyze a completed run and generate report
 */
export function analyzeRun(runSummary: RunSummary): AnalysisReport {
  const issues = runSummary.issues;
  const aggregated = aggregateIssues(issues);
  const suggestions = generateImprovementSuggestions(issues);

  // Determine overall health
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const dataQuality = runSummary.metrics.dataQualityScore || 0;

  let overallHealth: 'good' | 'degraded' | 'poor' = 'good';
  if (criticalCount > 0 || dataQuality < 0.5) {
    overallHealth = 'poor';
  } else if (errorCount > 2 || dataQuality < 0.7) {
    overallHealth = 'degraded';
  }

  // Generate improvement tasks
  const improvementTasks = generateImprovementTasks(runSummary, aggregated);

  // Identify tasks for nightly processing
  const nightlyTasks = identifyNightlyTasks(improvementTasks, aggregated);

  // Top problems
  const topProblems = Object.entries(aggregated)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([type, data]) => `${type}: ${data.count} occurrences`);

  const report: AnalysisReport = {
    runId: runSummary.runId,
    analyzedAt: new Date().toISOString(),
    summary: {
      totalIssues: issues.length,
      criticalIssues: criticalCount,
      dataQuality,
      verificationRate: runSummary.metrics.verificationRate || 0,
      overallHealth
    },
    issueBreakdown: Object.fromEntries(
      Object.entries(aggregated).map(([k, v]) => [k, v.count])
    ),
    topProblems,
    suggestions,
    improvementTasks,
    nightlyTasks
  };

  // Save report
  ensureDir();
  const reportFile = join(IMPROVEMENTS_DIR, `analysis-${runSummary.runId}.json`);
  writeFileSync(reportFile, JSON.stringify(report, null, 2));

  // Save improvement tasks
  for (const task of improvementTasks) {
    saveImprovementTask(task);
  }

  return report;
}

/**
 * Get recent analysis reports
 */
export function getRecentReports(days: number = 7): AnalysisReport[] {
  ensureDir();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const reports: AnalysisReport[] = [];

  const files = readdirSync(IMPROVEMENTS_DIR)
    .filter(f => f.startsWith('analysis-') && f.endsWith('.json'));

  for (const file of files) {
    const report: AnalysisReport = JSON.parse(
      readFileSync(join(IMPROVEMENTS_DIR, file), 'utf-8')
    );
    if (new Date(report.analyzedAt).getTime() > cutoff) {
      reports.push(report);
    }
  }

  return reports.sort((a, b) =>
    new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
  );
}

/**
 * Generate weekly improvement summary
 */
export function generateWeeklySummary(): {
  period: { from: string; to: string };
  totalRuns: number;
  healthDistribution: Record<string, number>;
  topIssues: Array<{ type: string; count: number }>;
  completedImprovements: number;
  pendingImprovements: number;
  recommendations: string[];
} {
  const reports = getRecentReports(7);
  const tasks = getPendingTasks();

  const healthDist: Record<string, number> = { good: 0, degraded: 0, poor: 0 };
  const issueCounts: Record<string, number> = {};

  for (const report of reports) {
    healthDist[report.summary.overallHealth]++;

    for (const [type, count] of Object.entries(report.issueBreakdown)) {
      issueCounts[type] = (issueCounts[type] || 0) + count;
    }
  }

  const topIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  const recommendations: string[] = [];

  if (healthDist.poor > healthDist.good) {
    recommendations.push('Workflow health is declining. Prioritize fixing data sources.');
  }

  if (topIssues[0]?.count > 10) {
    recommendations.push(`Focus on fixing "${topIssues[0].type}" - most common issue.`);
  }

  if (tasks.length > 10) {
    recommendations.push('Too many pending improvements. Schedule dedicated fix session.');
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    period: {
      from: weekAgo.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0]
    },
    totalRuns: reports.length,
    healthDistribution: healthDist,
    topIssues,
    completedImprovements: tasks.filter(t => t.status === 'completed').length,
    pendingImprovements: tasks.filter(t => t.status === 'pending').length,
    recommendations
  };
}
