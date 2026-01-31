/**
 * Health score calculation from ReviewData
 */

import type { ReviewData, HealthLevel } from './types.js';

export function calculateScore(data: ReviewData): number {
  let score = 100;

  // TypeScript errors: -3 each (real compiler errors, serious)
  score -= data.typescript.errorCount * 3;

  // ESLint errors: -2 each, warnings: -0.5 each
  score -= data.eslint.errorCount * 2;
  score -= data.eslint.warningCount * 0.5;

  // Architecture: surface
  score -= data.architecture.oversizedFiles.length * 2;
  score -= data.architecture.longFunctions.length * 1;

  // Architecture: deep
  score -= data.architecture.circularDeps.length * 5;
  score -= data.architecture.orphanFiles.length * 1;
  score -= data.architecture.importViolations.length * 3;
  score -= data.architecture.unusedDeps.length * 2;
  if (data.architecture.unusedExports > 10) score -= 5;

  // Security: critical -15, high -8, moderate -3, low -1
  score -= data.security.npmAudit.critical * 15;
  score -= data.security.npmAudit.high * 8;
  score -= data.security.npmAudit.moderate * 3;
  score -= data.security.npmAudit.low * 1;
  score -= data.security.secretsFound.length * 20;

  // Infra
  if (data.infra.diskUsagePercent >= 90) score -= 15;
  else if (data.infra.diskUsagePercent >= 80) score -= 5;
  if (data.infra.ramUsagePercent >= 90) score -= 10;
  score -= data.infra.failedServices.length * 10;

  // Maintenance
  score -= Math.min(data.maintenance.oldLogFiles.length, 10) * 0.5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getHealthLevel(score: number): HealthLevel {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  if (score >= 30) return 'poor';
  return 'critical';
}
