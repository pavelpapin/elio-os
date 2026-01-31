/**
 * System Review Analyzer - Recommendations Generator
 */

import type { SystemIssue } from '../types.js';

/**
 * Generate recommendations
 */
export function generateRecommendations(issues: SystemIssue[]): string[] {
  const recommendations: string[] = [];

  // Group by severity
  const critical = issues.filter((i) => i.severity === 'critical');
  const high = issues.filter((i) => i.severity === 'high');

  if (critical.length > 0) {
    recommendations.push(
      `FIX IMMEDIATELY: ${critical.length} critical issues require immediate attention`
    );
    for (const issue of critical.slice(0, 3)) {
      recommendations.push(`  - ${issue.title}: ${issue.description}`);
    }
  }

  if (high.length > 0) {
    recommendations.push(
      `Fix within 24h: ${high.length} high-priority issues`
    );
  }

  // Category-specific recommendations
  const securityIssues = issues.filter((i) => i.category === 'security');
  if (securityIssues.length > 0) {
    recommendations.push(
      `Security: ${securityIssues.length} vulnerabilities need review`
    );
  }

  const infraIssues = issues.filter((i) => i.category === 'infra');
  if (infraIssues.length > 0) {
    recommendations.push(
      `Infrastructure: ${infraIssues.length} resource issues detected`
    );
  }

  return recommendations;
}
