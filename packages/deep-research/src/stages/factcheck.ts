/**
 * Stage 3: Fact Check — cross-reference facts, categorize as verified/unverified/rejected
 */

import { callLLM, loadPrompt } from '../llm.js';
import { FactCheckResultSchema } from '../types.js';
import type { PipelineState } from '../types.js';

export async function execute(state: PipelineState): Promise<unknown> {
  const prompt = loadPrompt('fact_checker.md');
  const collection = state.stage_outputs.collection!;

  const allFacts = collection.agents.flatMap((a) => a.facts);
  const allLinks = collection.agents.flatMap((a) => a.raw_links);

  return callLLM({
    provider: 'claude',
    prompt,
    input: JSON.stringify({ facts: allFacts, sources: allLinks, total: allFacts.length }),
    outputSchema: FactCheckResultSchema,
  });
}
