/**
 * Post-Run Analyzer
 * Runs after each workflow execution to:
 * 1. Analyze issues from the run
 * 2. Generate improvement suggestions
 * 3. Create improvement tasks for nightly processing
 *
 * Re-export barrel - actual implementation split into modules
 */

// Re-export types
export type { ImprovementTask, AnalysisReport } from './analyzer-types.js';

// Re-export task management functions
export {
  generateImprovementTasks,
  identifyNightlyTasks,
  saveImprovementTask,
  getPendingTasks,
  updateTaskStatus
} from './analyzer-tasks.js';

// Re-export report functions
export {
  analyzeRun,
  getRecentReports,
  generateWeeklySummary
} from './analyzer-reports.js';
