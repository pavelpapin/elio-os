/**
 * @elio/system-review v2
 * Hybrid pipeline: deterministic collection + LLM analysis + deterministic fixes
 */

export { collectAll } from './collectors/index.js';
export { buildAnalysisPrompt, parseFixPlan, buildConservativePlan } from './analyze.js';
export { applyFixes } from './fixers/index.js';
export { verify, rollback, commitAndPush } from './verify.js';
export { generateMarkdownReport, generateTelegramSummary } from './report.js';
export { calculateScore, getHealthLevel } from './scoring.js';
export { exec } from './exec.js';

export type {
  ReviewData,
  GitData,
  TypescriptData,
  EslintData,
  ArchitectureData,
  SecurityData,
  InfraData,
  MaintenanceData,
  FixPlan,
  FixAction,
  FixResult,
  VerifyResult,
  HealthLevel,
} from './types.js';

export {
  ReviewDataSchema,
  FixPlanSchema,
  FixActionSchema,
} from './types.js';

// Gates (used by execute.ts internally)
export { GATES } from './orchestrator/gates.js';
export type { StageId, ExecutionContext, OrchestratorState } from './orchestrator/types.js';

// BullMQ entry point — this is the primary API
export { executeSystemReview } from './execute.js';
export type { SystemReviewResult, ProgressAdapter } from './execute.js';

/** Workflow meta for dynamic registration */
export const workflowMeta = {
  name: 'system-review' as const,
  version: 1,
  stages: ['Collect', 'Analyze', 'Fix', 'Verify', 'Report', 'Deliver'],
};
