/**
 * Review Result Formatter
 */

import type { Issue, ReviewResult, ReviewStats } from '../types.js';

export function generateSummary(issues: Issue[], stats: ReviewStats): string {
  const lines: string[] = [];

  lines.push(`# Code Review Summary\n`);
  lines.push(`Analyzed ${stats.totalFiles} files (${stats.totalLines} lines)\n`);
  lines.push(`Found ${issues.length} issues\n`);

  if (stats.issuesBySeverity.critical > 0) {
    lines.push(`\n## Critical Issues (${stats.issuesBySeverity.critical})\n`);
    for (const issue of issues.filter((i) => i.severity === 'critical')) {
      lines.push(`- **${issue.title}**: ${issue.description}`);
      if (issue.file) lines.push(`  - File: ${issue.file}:${issue.line || ''}`);
      if (issue.suggestion) lines.push(`  - Fix: ${issue.suggestion}`);
    }
  }

  if (stats.issuesBySeverity.high > 0) {
    lines.push(`\n## High Severity Issues (${stats.issuesBySeverity.high})\n`);
    for (const issue of issues.filter((i) => i.severity === 'high')) {
      lines.push(`- **${issue.title}**: ${issue.description}`);
      if (issue.file) lines.push(`  - File: ${issue.file}:${issue.line || ''}`);
    }
  }

  if (stats.issuesBySeverity.medium + stats.issuesBySeverity.low > 0) {
    lines.push(`\n## Other Issues\n`);
    lines.push(`- Medium: ${stats.issuesBySeverity.medium}`);
    lines.push(`- Low: ${stats.issuesBySeverity.low}`);
  }

  return lines.join('\n');
}

export function formatAsMarkdown(result: ReviewResult): string {
  const lines: string[] = [];

  lines.push(`# Code Review Report\n`);
  lines.push(`**Path:** ${result.path}`);
  lines.push(`**Date:** ${result.timestamp}`);
  lines.push(`**Files:** ${result.stats.totalFiles}`);
  lines.push(`**Lines:** ${result.stats.totalLines}\n`);

  lines.push(`## Summary\n`);
  lines.push(`| Severity | Count |`);
  lines.push(`|----------|-------|`);
  lines.push(`| Critical | ${result.stats.issuesBySeverity.critical} |`);
  lines.push(`| High | ${result.stats.issuesBySeverity.high} |`);
  lines.push(`| Medium | ${result.stats.issuesBySeverity.medium} |`);
  lines.push(`| Low | ${result.stats.issuesBySeverity.low} |`);

  if (result.issues.length > 0) {
    lines.push(`\n## Issues\n`);
    const grouped = new Map<string, typeof result.issues>();
    for (const issue of result.issues) {
      if (!grouped.has(issue.category)) grouped.set(issue.category, []);
      grouped.get(issue.category)!.push(issue);
    }

    for (const [category, categoryIssues] of grouped) {
      lines.push(`\n### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`);
      for (const issue of categoryIssues) {
        lines.push(`- [${issue.severity.toUpperCase()}] **${issue.title}**: ${issue.description}`);
        if (issue.file) lines.push(`  - Location: \`${issue.file}${issue.line ? ':' + issue.line : ''}\``);
        if (issue.suggestion) lines.push(`  - Suggestion: ${issue.suggestion}`);
      }
    }
  } else {
    lines.push(`\n## No Issues Found\n`);
    lines.push(`The code passed all checks.`);
  }

  return lines.join('\n');
}
