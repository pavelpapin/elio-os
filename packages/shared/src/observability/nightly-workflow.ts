/**
 * Nightly Improvement Workflow
 * Runs autonomously at night to fix issues and improve system
 *
 * Re-export barrel - actual implementation split into modules
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { getRecentIssues } from './logger-issues.js';
import { aggregateIssues } from './logger-analysis.js';
import { getPendingTasks, updateTaskStatus } from './analyzer-tasks.js';
import { getRecentReports } from './analyzer-reports.js';
import { getConfig, type NightlyConfig } from './nightly-config.js';
import { checkSourceHealth, type HealthCheckResult } from './nightly-health.js';
import { attemptAutoFix, type AutoFixResult } from './nightly-fixes.js';
import { notifyTelegram, type NightlyReport } from './nightly-notifications.js';

const NIGHTLY_DIR = '/root/.claude/logs/nightly';

function ensureDir(): void {
  if (!existsSync(NIGHTLY_DIR)) {
    mkdirSync(NIGHTLY_DIR, { recursive: true });
  }
}

/**
 * Main nightly workflow
 */
export async function runNightlyImprovement(): Promise<NightlyReport> {
  ensureDir();
  const config = getConfig();
  const startTime = Date.now();
  const today = new Date().toISOString().split('T')[0];

  console.log('[Nightly] Starting improvement workflow...');

  // Stage 1: Collect issues
  console.log('[Nightly] Stage 1: Collecting issues...');
  const issues = getRecentIssues(1); // Last 24 hours
  const tasks = getPendingTasks();
  const aggregated = aggregateIssues(issues);

  console.log(`[Nightly] Found ${issues.length} issues, ${tasks.length} pending tasks`);

  // Stage 2: Health checks
  const healthChecks: Record<string, HealthCheckResult> = {};

  if (config.healthCheck.enabled) {
    console.log('[Nightly] Stage 2: Running health checks...');
    for (const source of config.healthCheck.sources) {
      console.log(`[Nightly] Checking ${source}...`);
      healthChecks[source] = await checkSourceHealth(source);
      console.log(`[Nightly] ${source}: ${healthChecks[source].status}`);
    }
  }

  // Stage 3: Auto-fixes
  const autoFixes: AutoFixResult[] = [];

  if (config.autoFix.enabled) {
    console.log('[Nightly] Stage 3: Attempting auto-fixes...');
    const tasksToFix = tasks
      .filter(t => t.priority === 'high' || t.priority === 'critical')
      .slice(0, config.autoFix.maxFixes);

    for (const task of tasksToFix) {
      console.log(`[Nightly] Attempting fix: ${task.title}`);
      const fix = await attemptAutoFix(task, config);
      autoFixes.push(fix);

      if (fix.result === 'success') {
        updateTaskStatus(task.id, 'completed', fix.details);
      }
    }
  }

  // Stage 4: Generate pending tasks for morning
  const pendingForMorning: string[] = [];

  // Add failed health checks
  for (const [source, check] of Object.entries(healthChecks)) {
    if (check.status === 'failed') {
      pendingForMorning.push(`${source}: ${check.error || 'failed health check'}`);
    }
  }

  // Add high-priority unfixed tasks
  for (const task of tasks) {
    if (task.priority === 'critical' && task.status === 'pending') {
      pendingForMorning.push(task.title);
    }
  }

  // Stage 5: Build report
  const okCount = Object.values(healthChecks).filter(h => h.status === 'ok').length;
  const totalChecks = Object.keys(healthChecks).length;
  const criticalIssues = issues.filter(i => i.severity === 'critical').length;

  let overallHealth: 'good' | 'degraded' | 'poor' = 'good';
  if (okCount < totalChecks * 0.5 || criticalIssues > 0) {
    overallHealth = 'poor';
  } else if (okCount < totalChecks * 0.8) {
    overallHealth = 'degraded';
  }

  const recommendations: string[] = [];

  if (aggregated.data_source_failed?.count > 5) {
    recommendations.push('Multiple data sources failing. Review integration code.');
  }

  if (aggregated.verification_failed?.count > 3) {
    recommendations.push('Add more diverse sources for fact verification.');
  }

  if (tasks.length > 20) {
    recommendations.push('Too many pending tasks. Schedule cleanup session.');
  }

  const report: NightlyReport = {
    date: today,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    duration: Date.now() - startTime,
    issuesProcessed: issues.length,
    issuesFixed: autoFixes.filter(f => f.result === 'success').length,
    healthChecks,
    autoFixes,
    pendingForMorning,
    summary: {
      overallHealth,
      criticalIssues,
      recommendations
    }
  };

  // Save report
  const reportPath = join(NIGHTLY_DIR, `${today}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`[Nightly] Report saved to ${reportPath}`);

  // Stage 6: Notify
  if (config.notifications.telegram) {
    if (!config.notifications.onlyOnIssues || pendingForMorning.length > 0) {
      await notifyTelegram(report);
    }
  }

  console.log('[Nightly] Workflow completed!');
  console.log(`[Nightly] Health: ${overallHealth}, Fixed: ${report.issuesFixed}/${report.issuesProcessed}`);

  return report;
}

/**
 * Get last nightly report
 */
export function getLastNightlyReport(): NightlyReport | null {
  ensureDir();

  const files = readdirSync(NIGHTLY_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  return JSON.parse(readFileSync(join(NIGHTLY_DIR, files[0]), 'utf-8'));
}

/**
 * Check if nightly should run (for scheduler)
 */
export function shouldRunNightly(): boolean {
  const config = getConfig();
  if (!config.enabled) return false;

  const lastReport = getLastNightlyReport();
  if (!lastReport) return true;

  // Don't run if already ran today
  const today = new Date().toISOString().split('T')[0];
  return lastReport.date !== today;
}

// Re-export types
export type { NightlyConfig, HealthCheckResult, AutoFixResult, NightlyReport };
