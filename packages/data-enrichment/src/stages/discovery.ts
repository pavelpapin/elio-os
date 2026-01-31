/**
 * Stage 0: Discovery — parse sample data, ask user what to enrich
 */

import { readFileSync, existsSync } from 'fs';
import { callLLM, loadPrompt } from '../llm.js';
import { parseInput } from '../parsers/index.js';
import { EnrichmentBriefSchema } from '../types.js';
import type { PipelineState } from '../types.js';

export async function execute(state: PipelineState): Promise<unknown> {
  const prompt = loadPrompt('discovery.md');

  // Check if user already provided input (resume mode)
  const inputPath = `/root/.claude/logs/workflows/data-enrichment/${state.run_id}/user_input.json`;
  if (existsSync(inputPath)) {
    const userInput = readFileSync(inputPath, 'utf-8');
    const briefPrompt = `${prompt}\n\nThe user answered your discovery questions. Form an Enrichment Brief JSON from their answers and the sample data.`;
    return callLLM({
      provider: 'claude',
      prompt: briefPrompt,
      input: userInput,
      outputSchema: EnrichmentBriefSchema,
    });
  }

  // Parse input file to get sample data
  const parsed = await parseInput(state.input_source);
  const sample = parsed.records.slice(0, 5);

  const context = JSON.stringify({
    input_file: state.input_source,
    input_format: parsed.format,
    columns: parsed.columns,
    total_records: parsed.totalCount,
    sample_records: sample,
  });

  // Generate questions for user
  const questions = await callLLM({
    provider: 'claude',
    prompt: `${prompt}\n\nAnalyze this data and generate discovery questions. Return JSON with a "questions" array of strings (5-8 questions about what to enrich).`,
    input: context,
  });

  throw new PausedForInput(questions);
}

export class PausedForInput {
  constructor(public readonly questions: unknown) {}
}
