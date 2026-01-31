/**
 * Agent Error & Issue Logger
 * Logs non-technical issues: data source failures, missing info, quality problems
 * Used for post-run analysis and self-improvement
 *
 * Re-export barrel - actual implementation split into modules
 */

// Re-export types
export type {
  IssueType,
  IssueSeverity,
  WorkflowIssue,
  RunSummary,
  StageLog
} from './logger-types.js';

// Re-export run management functions
export {
  startRun,
  startStage,
  completeStage,
  logSourceSuccess,
  completeRun,
  getRunSummary
} from './logger-runs.js';

// Re-export issue functions
export {
  logIssue,
  getTodayIssues,
  getRecentIssues
} from './logger-issues.js';

// Re-export analysis functions
export {
  aggregateIssues,
  generateImprovementSuggestions
} from './logger-analysis.js';
