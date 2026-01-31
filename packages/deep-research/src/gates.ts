/**
 * Stage gates — pure validation functions
 */

import type { GateResult, PipelineState, StageName } from './types.js';
import {
  ResearchBriefSchema,
  ResearchPlanSchema,
  CollectionResultSchema,
  FactCheckResultSchema,
  SynthesisResultSchema,
  DevilsAdvocateSchema,
  ReportResultSchema,
  ConsiliumResultSchema,
} from './types.js';

type GateFn = (output: unknown, state: PipelineState) => GateResult;

const gates: Record<StageName, GateFn> = {
  discovery(output) {
    const r = ResearchBriefSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid brief' };
    if (!r.data.confirmed_by_user) return { passed: false, reason: 'Brief not confirmed' };
    return { passed: true };
  },

  planning(output) {
    const r = ResearchPlanSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid plan' };
    if (r.data.subtopics.length === 0) return { passed: false, reason: 'No subtopics' };
    return { passed: true };
  },

  collection(output) {
    const r = CollectionResultSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid collection' };
    if (r.data.agents.length < 2) return { passed: false, reason: 'Too few agents returned data' };
    return { passed: true };
  },

  factcheck(output) {
    const r = FactCheckResultSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid factcheck' };
    if (r.data.verified_facts.length === 0) return { passed: false, reason: 'Zero verified facts' };
    return { passed: true };
  },

  synthesis(output) {
    const r = SynthesisResultSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid synthesis' };
    if (r.data.recommendations.length < 3) return { passed: false, reason: 'Fewer than 3 recommendations' };
    return { passed: true };
  },

  devils_advocate(output) {
    const r = DevilsAdvocateSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid devils advocate' };
    if (r.data.risks.length === 0) return { passed: false, reason: 'No risks documented' };
    return { passed: true };
  },

  report(output) {
    const r = ReportResultSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid report result' };
    if (r.data.block_count < 15) return { passed: false, reason: 'Notion page too small' };
    return { passed: true };
  },

  review(output) {
    const r = ConsiliumResultSchema.safeParse(output);
    if (!r.success) return { passed: false, reason: 'Invalid review' };
    if (r.data.final_verdict === 'approved') return { passed: true };
    return { passed: false, reason: r.data.final_verdict };
  },
};

export function checkGate(stage: StageName, output: unknown, state: PipelineState): GateResult {
  return gates[stage](output, state);
}
