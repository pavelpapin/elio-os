/**
 * Issue Aggregation and Analysis
 */

import type { WorkflowIssue, IssueType } from './logger-types.js';

/**
 * Aggregate issues by type for analysis
 */
export function aggregateIssues(issues: WorkflowIssue[]): Record<IssueType, {
  count: number;
  sources: string[];
  suggestions: string[];
}> {
  const agg: Record<string, { count: number; sources: Set<string>; suggestions: Set<string> }> = {};

  for (const issue of issues) {
    if (!agg[issue.issueType]) {
      agg[issue.issueType] = { count: 0, sources: new Set(), suggestions: new Set() };
    }
    agg[issue.issueType].count++;
    if (issue.context.source) agg[issue.issueType].sources.add(issue.context.source);
    if (issue.context.suggestion) agg[issue.issueType].suggestions.add(issue.context.suggestion);
  }

  // Convert Sets to arrays
  const result: Record<string, { count: number; sources: string[]; suggestions: string[] }> = {};
  for (const [key, value] of Object.entries(agg)) {
    result[key] = {
      count: value.count,
      sources: Array.from(value.sources),
      suggestions: Array.from(value.suggestions)
    };
  }

  return result as Record<IssueType, { count: number; sources: string[]; suggestions: string[] }>;
}

/**
 * Generate improvement suggestions based on issues
 */
export function generateImprovementSuggestions(issues: WorkflowIssue[]): string[] {
  const suggestions: string[] = [];
  const agg = aggregateIssues(issues);

  // Data source failures
  if (agg.data_source_failed?.count > 3) {
    const sources = agg.data_source_failed.sources.join(', ');
    suggestions.push(`Multiple data source failures (${agg.data_source_failed.count}x). Review sources: ${sources}`);
  }

  // Blocked sources
  if (agg.data_source_blocked?.count > 0) {
    suggestions.push(`Sources actively blocking us: ${agg.data_source_blocked.sources.join(', ')}. Consider alternative sources or proxy rotation.`);
  }

  // Verification issues
  if (agg.verification_failed?.count > 2) {
    suggestions.push(`Verification failing often (${agg.verification_failed.count}x). Add more diverse sources or relax 2-source rule for specific data types.`);
  }

  // Rate limiting
  if (agg.rate_limited?.count > 0) {
    suggestions.push(`Hit rate limits on: ${agg.rate_limited.sources.join(', ')}. Implement better rate limiting or use cached data.`);
  }

  // Quality issues
  if (agg.quality_low?.count > 0) {
    suggestions.push(`Low quality results detected. Review prompts and add quality gates.`);
  }

  // Timeout issues
  if (agg.timeout?.count > 0) {
    suggestions.push(`Timeouts occurring. Consider parallel fetching or increasing limits.`);
  }

  return suggestions;
}
