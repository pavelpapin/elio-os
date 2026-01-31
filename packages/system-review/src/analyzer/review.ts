/**
 * System Review Analyzer - Main Review Function
 */

import { reviewCode } from '@elio/code-review';
import type {
  SystemReviewResult,
  SystemReviewConfig,
  SystemIssue,
  InfraMetrics,
  ReviewSummary,
} from '../types.js';
import { resetCounter } from './utils.js';
import { getInfraMetrics, analyzeInfra } from './infra.js';
import { calculateHealthScore, getHealthLevel } from './scoring.js';
import { convertCodeIssues } from './converter.js';
import { generateRecommendations } from './recommendations.js';

/**
 * Run system review
 */
export async function runSystemReview(
  config: Partial<SystemReviewConfig> = {}
): Promise<SystemReviewResult> {
  const fullConfig: SystemReviewConfig = {
    scope: config.scope ?? 'full',
    since: config.since ?? '24h',
    targetPath: config.targetPath ?? '/root/.claude',
    autoFix: config.autoFix ?? false,
  };

  resetCounter();
  const allIssues: SystemIssue[] = [];

  // Run code review if scope includes it
  if (['full', 'code', 'architecture', 'security'].includes(fullConfig.scope)) {
    const codeResult = await reviewCode(fullConfig.targetPath, {
      checkSecurity: fullConfig.scope === 'full' || fullConfig.scope === 'security',
      checkArchitecture: fullConfig.scope === 'full' || fullConfig.scope === 'architecture',
      checkDependencies: fullConfig.scope === 'full',
    });
    allIssues.push(...convertCodeIssues(codeResult));
  }

  // Get infra metrics if scope includes it
  let infraMetrics: InfraMetrics = {
    diskUsagePercent: 0,
    ramUsagePercent: 0,
    swapUsagePercent: 0,
    failedServices: [],
    uptimeHours: 0,
  };

  if (['full', 'infra'].includes(fullConfig.scope)) {
    infraMetrics = getInfraMetrics();
    allIssues.push(...analyzeInfra(infraMetrics));
  }

  // Calculate summary
  const summary: ReviewSummary = {
    codeIssues: allIssues.filter((i) => i.category === 'code').length,
    architectureIssues: allIssues.filter((i) => i.category === 'architecture').length,
    securityIssues: allIssues.filter((i) => i.category === 'security').length,
    infraIssues: allIssues.filter((i) => i.category === 'infra').length,
    autoFixed: 0,
  };

  const healthScore = calculateHealthScore(allIssues);
  const healthLevel = getHealthLevel(healthScore);
  const recommendations = generateRecommendations(allIssues);

  return {
    timestamp: new Date().toISOString(),
    period: fullConfig.since,
    healthScore,
    healthLevel,
    issues: allIssues,
    infraMetrics,
    summary,
    recommendations,
  };
}
