/**
 * Data Enrichment — Zod schemas for all stage I/O
 */

import { z } from 'zod';

// ─── Stage Names ─────────────────────────────────────────────

export const STAGE_NAMES = [
  'discovery', 'planning', 'collection', 'validation',
  'synthesis', 'export', 'report', 'verification',
] as const;

export type StageName = (typeof STAGE_NAMES)[number];

// ─── Stage 0: Discovery ─────────────────────────────────────

export const EnrichmentBriefSchema = z.object({
  input_file: z.string().min(1),
  input_format: z.enum(['csv', 'json', 'notion']),
  sample_records: z.array(z.record(z.unknown())).min(1),
  fields_to_enrich: z.array(z.string()).min(1),
  enrichment_goals: z.array(z.string()).min(1),
  output_format: z.enum(['csv', 'json']).default('csv'),
  record_count: z.number().min(1),
  confirmed_by_user: z.literal(true),
});
export type EnrichmentBrief = z.infer<typeof EnrichmentBriefSchema>;

// ─── Stage 1: Planning ──────────────────────────────────────

export const FieldMappingSchema = z.object({
  source_field: z.string(),
  target_fields: z.array(z.string()),
  tools: z.array(z.string()),
  strategy: z.string(),
});

export const EnrichmentPlanSchema = z.object({
  field_mappings: z.array(FieldMappingSchema).min(1),
  batch_size: z.number().min(1).max(20).default(5),
  output_schema: z.record(z.string()),
  estimated_api_calls: z.number().optional(),
});
export type EnrichmentPlan = z.infer<typeof EnrichmentPlanSchema>;

// ─── Stage 2: Collection ────────────────────────────────────

export const EnrichedRecordSchema = z.object({
  original: z.record(z.unknown()),
  enriched: z.record(z.unknown()),
  sources: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const BatchResultSchema = z.object({
  records: z.array(EnrichedRecordSchema),
  errors: z.array(z.object({
    record_index: z.number(),
    error: z.string(),
  })),
  api_calls_made: z.number(),
});

export const CollectionResultSchema = z.object({
  batches: z.array(BatchResultSchema),
  total_processed: z.number(),
  total_errors: z.number(),
  total_api_calls: z.number(),
});
export type CollectionResult = z.infer<typeof CollectionResultSchema>;

// ─── Stage 3: Validation ────────────────────────────────────

export const ConflictSchema = z.object({
  record_index: z.number(),
  field: z.string(),
  values: z.array(z.object({
    value: z.unknown(),
    source: z.string(),
    confidence: z.number(),
  })),
  resolution: z.string().optional(),
});

export const ValidationResultSchema = z.object({
  validated_records: z.number(),
  conflicts: z.array(ConflictSchema),
  quality_scores: z.array(z.number()),
  average_quality_score: z.number(),
  flagged_issues: z.array(z.string()),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ─── Stage 4: Synthesis ─────────────────────────────────────

export const SynthesisResultSchema = z.object({
  merged_records: z.array(z.record(z.unknown())),
  conflicts_resolved: z.number(),
  insights: z.array(z.string()),
  data_quality_summary: z.string(),
  enrichment_coverage: z.number().min(0).max(1),
});
export type SynthesisResult = z.infer<typeof SynthesisResultSchema>;

// ─── Stage 5: Export ────────────────────────────────────────

export const ExportResultSchema = z.object({
  file_path: z.string(),
  format: z.enum(['csv', 'json']),
  record_count: z.number(),
  size_bytes: z.number(),
});
export type ExportResult = z.infer<typeof ExportResultSchema>;

// ─── Stage 6: Report ────────────────────────────────────────

export const ReportResultSchema = z.object({
  notion_url: z.string(),
  page_id: z.string(),
  block_count: z.number().min(1),
});
export type ReportResult = z.infer<typeof ReportResultSchema>;

// ─── Stage 7: Verification ─────────────────────────────────

export const VerificationResultSchema = z.object({
  file_check: z.object({
    exists: z.boolean(),
    record_count_matches: z.boolean(),
    size_bytes: z.number(),
  }),
  notion_check: z.object({
    exists: z.boolean(),
    block_count: z.number(),
  }),
  data_check: z.object({
    enrichment_coverage: z.number(),
    all_required_fields: z.boolean(),
    no_corruption: z.boolean(),
  }),
  all_passed: z.boolean(),
});
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

// ─── Pipeline State ─────────────────────────────────────────

export const StageOutputsSchema = z.object({
  discovery: EnrichmentBriefSchema.optional(),
  planning: EnrichmentPlanSchema.optional(),
  collection: CollectionResultSchema.optional(),
  validation: ValidationResultSchema.optional(),
  synthesis: SynthesisResultSchema.optional(),
  export: ExportResultSchema.optional(),
  report: ReportResultSchema.optional(),
  verification: VerificationResultSchema.optional(),
});

export const PipelineStateSchema = z.object({
  run_id: z.string(),
  input_source: z.string(),
  current_stage: z.enum([...STAGE_NAMES, 'done']),
  started_at: z.string(),
  updated_at: z.string(),
  status: z.enum(['running', 'paused_for_input', 'completed', 'failed']),
  stage_outputs: StageOutputsSchema,
  error: z.string().optional(),
});
export type PipelineState = z.infer<typeof PipelineStateSchema>;

// ─── Gate Result ────────────────────────────────────────────

export interface GateResult {
  passed: boolean;
  reason?: string;
}

// ─── LLM Call ───────────────────────────────────────────────

export interface LLMCallOptions {
  provider: 'claude' | 'openai' | 'groq';
  prompt: string;
  input: string;
  outputSchema?: z.ZodSchema;
  maxRetries?: number;
  timeoutMs?: number;
  allowedTools?: string[];
}
