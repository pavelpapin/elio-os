/**
 * Stage 5: Devil's Advocate — risks, counterarguments, blind spots
 */

import { callLLM, loadPrompt } from '../llm.js';
import { DevilsAdvocateSchema } from '../types.js';
import type { PipelineState } from '../types.js';

export async function execute(state: PipelineState): Promise<unknown> {
  const prompt = loadPrompt('devils_advocate.md');
  const synthesis = state.stage_outputs.synthesis!;

  return callLLM({
    provider: 'claude',
    prompt,
    input: JSON.stringify(synthesis),
    outputSchema: DevilsAdvocateSchema,
  });
}
