/**
 * Stage 4: Synthesis — merge data, resolve conflicts, generate insights
 */

import { callLLM, loadPrompt } from '../llm.js';
import { SynthesisResultSchema } from '../types.js';
import type { PipelineState } from '../types.js';

export async function execute(state: PipelineState): Promise<unknown> {
  const prompt = loadPrompt('synthesizer.md');
  const collection = state.stage_outputs.collection!;
  const validation = state.stage_outputs.validation!;
  const brief = state.stage_outputs.discovery!;

  const allRecords = collection.batches.flatMap((b) => b.records);

  const input = {
    enriched_records: allRecords,
    conflicts: validation.conflicts,
    quality_scores: validation.quality_scores,
    flagged_issues: validation.flagged_issues,
    output_format: brief.output_format,
    enrichment_goals: brief.enrichment_goals,
  };

  return callLLM({
    provider: 'claude',
    prompt,
    input: JSON.stringify(input),
    outputSchema: SynthesisResultSchema,
  });
}
