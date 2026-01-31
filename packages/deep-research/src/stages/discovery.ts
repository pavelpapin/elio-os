/**
 * Stage 0: Discovery — interactive, generates questions then Brief
 */

import { readFileSync, existsSync } from 'fs';
import { callLLM, loadPrompt } from '../llm.js';
import { ResearchBriefSchema } from '../types.js';
import type { PipelineState } from '../types.js';

export async function execute(state: PipelineState): Promise<unknown> {
  const prompt = loadPrompt('discovery.md');

  // Check if user already provided input (resume mode)
  const inputPath = `/root/.claude/logs/workflows/deep-research/${state.run_id}/user_input.json`;
  if (existsSync(inputPath)) {
    const userInput = readFileSync(inputPath, 'utf-8');
    const briefPrompt = `${prompt}\n\nThe user answered your discovery questions. Form a Research Brief JSON from their answers.`;
    return callLLM({
      provider: 'claude',
      prompt: briefPrompt,
      input: userInput,
      outputSchema: ResearchBriefSchema,
    });
  }

  // First call: generate questions for the user
  const questions = await callLLM({
    provider: 'claude',
    prompt: `${prompt}\n\nGenerate discovery questions for this research topic. Return JSON with a "questions" array of strings (5-10 questions).`,
    input: JSON.stringify({ topic: state.topic }),
  });

  // Signal to runner that we need user input
  throw new PausedForInput(questions);
}

export class PausedForInput {
  constructor(public readonly questions: unknown) {}
}
