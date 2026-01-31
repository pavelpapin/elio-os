/**
 * @elio/deep-research
 * Multi-stage research workflow with fact-checking and multi-model review
 */

export { executeDeepResearch } from './execute.js';
export type { DeepResearchParams, DeepResearchResult, ProgressAdapter } from './execute.js';

export { STAGE_NAMES } from './types.js';

/** Workflow meta for dynamic registration */
export const workflowMeta = {
  name: 'deep-research' as const,
  version: 1,
  stages: ['discovery', 'planning', 'collection', 'factcheck', 'synthesis', 'devils_advocate', 'report', 'review'],
};
export type {
  StageName,
  PipelineState,
  ResearchBrief,
  ResearchPlan,
  CollectionResult,
  FactCheckResult,
  SynthesisResult,
  DevilsAdvocateResult,
  ReportResult,
  ConsiliumResult,
} from './types.js';
