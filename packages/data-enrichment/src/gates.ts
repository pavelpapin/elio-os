/**
 * Stage gates — pure validation functions
 */

import type { GateResult, PipelineState, StageName } from './types.js';
import {
  EnrichmentBriefSchema,
  EnrichmentPlanSchema,
  CollectionResultSchema,
  ValidationResultSchema,
  SynthesisResultSchema,
  ExportResultSchema,
  ReportResultSchema,
  VerificationResultSchema,
} from './types.js';

type GateFn = (output: unknown, state: PipelineState) => GateResult;

const gates: Record<StageName, GateFn> = {
  discovery(output) {
    const r = EnrichmentBriefSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid brief' };
    if (!r.data.confirmed_by_user) return { passed: false, reason: 'Brief not confirmed' };
    return { passed: true };
  },

  planning(output) {
    const r = EnrichmentPlanSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid plan' };
    if (r.data.field_mappings.length === 0) return { passed: false, reason: 'No field mappings' };
    return { passed: true };
  },

  collection(output) {
    const r = CollectionResultSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid collection' };
    const rate = r.data.total_processed / (r.data.total_processed + r.data.total_errors);
    if (rate < 0.8) return { passed: false, reason: `Only ${Math.round(rate * 100)}% processed (need 80%)` };
    return { passed: true };
  },

  validation(output) {
    const r = ValidationResultSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid validation' };
    if (r.data.average_quality_score < 0.7) return { passed: false, reason: `Quality ${r.data.average_quality_score} < 0.7` };
    return { passed: true };
  },

  synthesis(output) {
    const r = SynthesisResultSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid synthesis' };
    if (r.data.enrichment_coverage < 0.5) return { passed: false, reason: `Coverage ${r.data.enrichment_coverage} < 0.5` };
    return { passed: true };
  },

  export(output) {
    const r = ExportResultSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid export' };
    if (r.data.size_bytes === 0) return { passed: false, reason: 'Empty file' };
    return { passed: true };
  },

  report(output) {
    const r = ReportResultSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid report' };
    if (r.data.block_count < 10) return { passed: false, reason: 'Report too small' };
    return { passed: true };
  },

  verification(output) {
    const r = VerificationResultSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid verification' };
    if (!r.data.all_passed) return { passed: false, reason: 'Verification checks failed' };
    return { passed: true };
  },
};

export function checkGate(stage: StageName, output: unknown, state: PipelineState): GateResult {
  return gates[stage](output, state);
}
