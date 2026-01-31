/**
 * Stage 4: Synthesis — produce findings, recommendations, decision framework
 */

import { callLLM, loadPrompt } from '../llm.js';
import { SynthesisResultSchema } from '../types.js';
import type { PipelineState } from '../types.js';

export async function execute(state: PipelineState): Promise<unknown> {
  const prompt = loadPrompt('synthesizer.md');
  const brief = state.stage_outputs.discovery!;
  const factcheck = state.stage_outputs.factcheck!;

  const input = {
    topic: brief.topic,
    goal: brief.goal,
    user_background: brief.user_background,
    constraints: brief.constraints,
    verified_facts: factcheck.verified_facts,
    unverified_facts: factcheck.unverified_facts,
    verification_stats: factcheck.verification_stats,
  };

  // If this is a revision iteration, include consilium feedback
  if (state.iteration > 0 && state.stage_outputs.review?.unified_tz) {
    Object.assign(input, { revision_feedback: state.stage_outputs.review.unified_tz });
  }

  return callLLM({
    provider: 'claude',
    prompt,
    input: JSON.stringify(input),
    outputSchema: SynthesisResultSchema,
  });
}
