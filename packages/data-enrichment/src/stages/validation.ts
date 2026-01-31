/**
 * Stage 3: Validation — check conflicts, quality, flag issues
 */

import { callLLM, loadPrompt } from '../llm.js';
import { ValidationResultSchema } from '../types.js';
import type { PipelineState } from '../types.js';

export async function execute(state: PipelineState): Promise<unknown> {
  const prompt = loadPrompt('validator.md');
  const collection = state.stage_outputs.collection!;
  const brief = state.stage_outputs.discovery!;

  const allRecords = collection.batches.flatMap((b) => b.records);

  const input = {
    enriched_records: allRecords,
    original_fields: brief.sample_records[0] ? Object.keys(brief.sample_records[0]) : [],
    enrichment_goals: brief.enrichment_goals,
    total_records: allRecords.length,
  };

  return callLLM({
    provider: 'claude',
    prompt,
    input: JSON.stringify(input),
    outputSchema: ValidationResultSchema,
  });
}
