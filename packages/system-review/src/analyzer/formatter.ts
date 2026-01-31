/**
 * System Review Analyzer - Markdown Formatter
 */

import type { SystemReviewResult } from '../types.js';

/**
 * Format result as markdown
 */
export function formatAsMarkdown(result: SystemReviewResult): string {
  const emoji = {
    excellent: '🟢',
    good: '🟡',
    warning: '🟠',
    poor: '🔴',
    critical: '⛔',
  }[result.healthLevel];

  const lines: string[] = [];

  lines.push(`# System Review — ${result.timestamp.split('T')[0]}\n`);
  lines.push(`## Health Score: ${result.healthScore}/100 ${emoji}\n`);

  lines.push(`## Summary\n`);
  lines.push(`| Category | Issues |`);
  lines.push(`|----------|--------|`);
  lines.push(`| Code | ${result.summary.codeIssues} |`);
  lines.push(`| Architecture | ${result.summary.architectureIssues} |`);
  lines.push(`| Security | ${result.summary.securityIssues} |`);
  lines.push(`| Infrastructure | ${result.summary.infraIssues} |`);

  lines.push(`\n## Infrastructure Metrics\n`);
  lines.push(`- Disk: ${result.infraMetrics.diskUsagePercent}%`);
  lines.push(`- RAM: ${result.infraMetrics.ramUsagePercent}%`);
  lines.push(`- Swap: ${result.infraMetrics.swapUsagePercent}%`);
  lines.push(`- Uptime: ${result.infraMetrics.uptimeHours}h`);
  if (result.infraMetrics.failedServices.length > 0) {
    lines.push(`- Failed Services: ${result.infraMetrics.failedServices.join(', ')}`);
  }

  const critical = result.issues.filter((i) => i.severity === 'critical');
  if (critical.length > 0) {
    lines.push(`\n## Critical Issues (${critical.length})\n`);
    for (const issue of critical) {
      lines.push(`### [${issue.category.toUpperCase()}] ${issue.title}`);
      lines.push(`${issue.description}`);
      if (issue.file) lines.push(`- File: ${issue.file}:${issue.line || ''}`);
      if (issue.suggestion) lines.push(`- Fix: ${issue.suggestion}`);
      lines.push('');
    }
  }

  const high = result.issues.filter((i) => i.severity === 'high');
  if (high.length > 0) {
    lines.push(`\n## High Priority (${high.length})\n`);
    for (const issue of high.slice(0, 10)) {
      lines.push(`- **${issue.title}**: ${issue.description}`);
    }
    if (high.length > 10) {
      lines.push(`- ... and ${high.length - 10} more`);
    }
  }

  const medium = result.issues.filter((i) => i.severity === 'medium');
  const low = result.issues.filter((i) => i.severity === 'low');
  if (medium.length + low.length > 0) {
    lines.push(`\n## Other Issues\n`);
    lines.push(`- Medium: ${medium.length}`);
    lines.push(`- Low: ${low.length}`);
  }

  if (result.recommendations.length > 0) {
    lines.push(`\n## Recommendations\n`);
    for (const rec of result.recommendations) {
      lines.push(`- ${rec}`);
    }
  }

  return lines.join('\n');
}
