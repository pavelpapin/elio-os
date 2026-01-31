/**
 * @elio/data-enrichment
 * Data enrichment workflow — enrich CSV/JSON/Notion data via external APIs
 */

export { executeDataEnrichment } from './execute.js';
export type { DataEnrichmentParams, DataEnrichmentResult, ProgressAdapter } from './execute.js';

export { STAGE_NAMES } from './types.js';

/** Workflow meta for dynamic registration */
export const workflowMeta = {
  name: 'data-enrichment' as const,
  version: 1,
  stages: ['discovery', 'planning', 'collection', 'validation', 'synthesis', 'export', 'report', 'verification'],
};
export type {
  StageName,
  PipelineState,
  EnrichmentBrief,
  EnrichmentPlan,
  CollectionResult,
  ValidationResult,
  SynthesisResult,
  ExportResult,
  ReportResult,
  VerificationResult,
} from './types.js';
