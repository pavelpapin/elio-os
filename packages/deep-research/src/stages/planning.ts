/**
 * Stage 1: Planning — break topic into subtopics and assign agents
 */

import { callLLM, loadPrompt } from '../llm.js';
import { ResearchPlanSchema } from '../types.js';
import type { PipelineState } from '../types.js';

export async function execute(state: PipelineState): Promise<unknown> {
  const prompt = loadPrompt('planner.md');
  const brief = state.stage_outputs.discovery;

  return callLLM({
    provider: 'claude',
    prompt,
    input: JSON.stringify(brief),
    outputSchema: ResearchPlanSchema,
  });
}
