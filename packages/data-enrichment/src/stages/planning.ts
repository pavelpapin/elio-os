/**
 * Stage 1: Planning — create enrichment plan with field→tool mappings
 */

import { callLLM, loadPrompt } from '../llm.js';
import { EnrichmentPlanSchema } from '../types.js';
import type { PipelineState } from '../types.js';

export async function execute(state: PipelineState): Promise<unknown> {
  const prompt = loadPrompt('planning.md');
  const brief = state.stage_outputs.discovery;

  return callLLM({
    provider: 'claude',
    prompt,
    input: JSON.stringify(brief),
    outputSchema: EnrichmentPlanSchema,
  });
}
