/**
 * System Review Analyzer - Health Scoring
 */

import type { SystemIssue, HealthLevel } from '../types.js';

/**
 * Calculate health score
 */
export function calculateHealthScore(issues: SystemIssue[]): number {
  let score = 100;

  for (const issue of issues) {
    switch (issue.severity) {
      case 'critical':
        score -= 25;
        break;
      case 'high':
        score -= 10;
        break;
      case 'medium':
        score -= 5;
        break;
      case 'low':
        score -= 1;
        break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get health level from score
 */
export function getHealthLevel(score: number): HealthLevel {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  if (score >= 30) return 'poor';
  return 'critical';
}
