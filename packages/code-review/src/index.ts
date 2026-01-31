/**
 * @elio/code-review
 * Automated code review system
 */

export {
  reviewCode,
  analyzeSecurityIssues,
  analyzeArchitectureIssues,
  analyzeFileStats,
  analyzeDependencies,
  formatAsMarkdown,
} from './analyzer.js';

export { SECURITY_CHECKS } from './security-checks.js';

export type {
  Issue,
  Severity,
  IssueCategory,
  SecurityCheck,
  FileStats,
  ReviewResult,
  ReviewConfig,
  ReviewStats,
  DependencyInfo,
  VulnerabilityInfo,
} from './types.js';

export { DEFAULT_CONFIG } from './types.js';
