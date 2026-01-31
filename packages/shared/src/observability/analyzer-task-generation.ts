/**
 * Improvement Task Generation Logic
 */

import type { ImprovementTask } from './analyzer-types.js';
import type { RunSummary } from './logger-types.js';

/**
 * Generate improvement tasks from aggregated issues
 */
export function generateImprovementTasks(
  run: RunSummary,
  aggregated: Record<string, { count: number; sources: string[]; suggestions: string[] }>
): ImprovementTask[] {
  const tasks: ImprovementTask[] = [];
  const timestamp = Date.now();

  // Data source failures -> investigate and fix
  if (aggregated.data_source_failed?.count > 0) {
    for (const source of aggregated.data_source_failed.sources) {
      tasks.push({
        id: `improve-${timestamp}-${tasks.length}`,
        createdAt: new Date().toISOString(),
        sourceRunId: run.runId,
        workflowType: run.workflowType,
        priority: aggregated.data_source_failed.count > 3 ? 'high' : 'medium',
        category: 'data_source',
        title: `Fix data source: ${source}`,
        description: `Data source "${source}" failed ${aggregated.data_source_failed.count} times during ${run.workflowType} run.`,
        suggestedFix: `1. Check if API key is valid\n2. Check if endpoint changed\n3. Add fallback source`,
        relatedIssues: run.issues.filter(i => i.context.source === source).map(i => i.timestamp),
        status: 'pending'
      });
    }
  }

  // Blocked sources -> find alternatives
  if (aggregated.data_source_blocked?.count > 0) {
    tasks.push({
      id: `improve-${timestamp}-${tasks.length}`,
      createdAt: new Date().toISOString(),
      sourceRunId: run.runId,
      workflowType: run.workflowType,
      priority: 'high',
      category: 'data_source',
      title: `Find alternatives for blocked sources`,
      description: `Sources blocking access: ${aggregated.data_source_blocked.sources.join(', ')}`,
      suggestedFix: `1. Research alternative APIs\n2. Try different proxy\n3. Use web search workaround`,
      relatedIssues: [],
      status: 'pending'
    });
  }

  // Quality issues -> review prompts
  if (aggregated.quality_low?.count > 0) {
    tasks.push({
      id: `improve-${timestamp}-${tasks.length}`,
      createdAt: new Date().toISOString(),
      sourceRunId: run.runId,
      workflowType: run.workflowType,
      priority: 'medium',
      category: 'quality',
      title: `Improve output quality for ${run.workflowType}`,
      description: `${aggregated.quality_low.count} low quality outputs detected`,
      suggestedFix: `1. Review and improve prompts\n2. Add quality validation step\n3. Increase source diversity`,
      relatedIssues: [],
      status: 'pending'
    });
  }

  // Verification failures -> add sources
  if (aggregated.verification_failed?.count > 2) {
    tasks.push({
      id: `improve-${timestamp}-${tasks.length}`,
      createdAt: new Date().toISOString(),
      sourceRunId: run.runId,
      workflowType: run.workflowType,
      priority: 'medium',
      category: 'quality',
      title: `Improve fact verification coverage`,
      description: `${aggregated.verification_failed.count} facts couldn't be verified with 2+ sources`,
      suggestedFix: `1. Add more diverse sources\n2. Implement fuzzy matching for verification\n3. Tag low-confidence facts`,
      relatedIssues: [],
      status: 'pending'
    });
  }

  // Rate limiting -> implement better throttling
  if (aggregated.rate_limited?.count > 0) {
    tasks.push({
      id: `improve-${timestamp}-${tasks.length}`,
      createdAt: new Date().toISOString(),
      sourceRunId: run.runId,
      workflowType: run.workflowType,
      priority: 'medium',
      category: 'performance',
      title: `Improve rate limiting for ${aggregated.rate_limited.sources.join(', ')}`,
      description: `Hit rate limits during execution`,
      suggestedFix: `1. Add exponential backoff\n2. Implement request queue\n3. Cache more aggressively`,
      relatedIssues: [],
      status: 'pending'
    });
  }

  return tasks;
}

/**
 * Identify which tasks should be processed by nightly workflow
 */
export function identifyNightlyTasks(
  tasks: ImprovementTask[],
  aggregated: Record<string, { count: number; sources: string[]; suggestions: string[] }>
): string[] {
  const nightlyTasks: string[] = [];

  // Code-related fixes that can be automated
  for (const task of tasks) {
    if (task.category === 'data_source' && task.title.includes('Fix data source')) {
      nightlyTasks.push(`[AUTO-FIX] ${task.title}: Check API connectivity, update endpoints if changed`);
    }

    if (task.category === 'config') {
      nightlyTasks.push(`[AUTO-FIX] ${task.title}: Review and update configuration`);
    }
  }

  // Pattern analysis
  if (Object.keys(aggregated).length > 3) {
    nightlyTasks.push(`[ANALYSIS] Multiple issue types detected. Run pattern analysis across recent runs.`);
  }

  // Source health check
  const failedSources = aggregated.data_source_failed?.sources || [];
  const blockedSources = aggregated.data_source_blocked?.sources || [];
  const allProblematicSources = [...new Set([...failedSources, ...blockedSources])];

  if (allProblematicSources.length > 0) {
    nightlyTasks.push(`[HEALTH-CHECK] Test connectivity to: ${allProblematicSources.join(', ')}`);
  }

  // Documentation update
  if (aggregated.data_source_blocked?.count > 0) {
    nightlyTasks.push(`[DOCS] Update DATA_SOURCES.md with blocked sources status`);
  }

  return nightlyTasks;
}
