/**
 * Data Enrichment — Library API for BullMQ worker
 *
 * Runs the enrichment pipeline with ProgressReporter for state/streaming.
 * File-based state is kept as crash-recovery backup only.
 */

import { writeFileSync } from 'fs';
import { saveState, loadState, createInitialState } from './state.js';
import { checkGate } from './gates.js';
import { STAGE_NAMES } from './types.js';
import type { PipelineState, StageName } from './types.js';
import { PausedForInput } from './stages/discovery.js';
import type { ProgressAdapter } from '@elio/workflow';

export type { ProgressAdapter };

export interface DataEnrichmentParams {
  inputSource: string;
  resumeRunId?: string;
  userInputPath?: string;
}

export interface DataEnrichmentResult {
  status: 'completed' | 'paused_for_input' | 'failed';
  runId: string;
  enrichedFilePath?: string;
  notionUrl?: string;
  questions?: unknown;
  resumeCommand?: string;
  error?: string;
}

/**
 * Execute data enrichment pipeline.
 * Called by BullMQ worker — all progress goes through the adapter.
 */
export async function executeDataEnrichment(
  params: DataEnrichmentParams,
  progress: ProgressAdapter,
): Promise<DataEnrichmentResult> {
  let state: PipelineState;

  if (params.resumeRunId) {
    const loaded = loadState(params.resumeRunId);
    if (!loaded) {
      await progress.fail(`Run ${params.resumeRunId} not found`);
      return { status: 'failed', runId: params.resumeRunId, error: 'Run not found' };
    }
    state = loaded;

    if (params.userInputPath) {
      const { readFileSync } = await import('fs');
      const destPath = `/root/.claude/logs/workflows/data-enrichment/${state.run_id}/user_input.json`;
      writeFileSync(destPath, readFileSync(params.userInputPath, 'utf-8'));
      state.status = 'running';
    }
  } else {
    state = createInitialState(params.inputSource);
    saveState(state);
  }

  await progress.start(`Data Enrichment: ${state.input_source}`);
  await progress.setMetadata('runId', state.run_id);
  await progress.setMetadata('inputSource', state.input_source);

  try {
    const result = await runPipeline(state, progress);
    return result;
  } catch (err) {
    state.status = 'failed';
    state.error = String(err);
    saveState(state);
    await progress.fail(String(err));
    return { status: 'failed', runId: state.run_id, error: String(err) };
  }
}

async function runPipeline(
  state: PipelineState,
  progress: ProgressAdapter,
): Promise<DataEnrichmentResult> {
  const startIdx = state.current_stage === 'done'
    ? STAGE_NAMES.length
    : STAGE_NAMES.indexOf(state.current_stage as StageName);

  for (let i = startIdx; i < STAGE_NAMES.length; i++) {
    const stage = STAGE_NAMES[i];
    await progress.startStage(stage, `Stage ${i + 1}/${STAGE_NAMES.length}`);

    let result: unknown;
    try {
      const mod = await import(`./stages/${stage}.js`);
      result = await mod.execute(state);
    } catch (err) {
      if (err instanceof PausedForInput) {
        state.status = 'paused_for_input';
        state.current_stage = stage;
        saveState(state);

        const questionsPath = `/root/.claude/logs/workflows/data-enrichment/${state.run_id}/questions.json`;
        writeFileSync(questionsPath, JSON.stringify(err.questions, null, 2));

        await progress.requestInput(JSON.stringify(err.questions));

        return {
          status: 'paused_for_input',
          runId: state.run_id,
          questions: err.questions,
          resumeCommand: `elio job create workflow:data-enrichment --resume ${state.run_id} --input answers.json`,
        };
      }
      await progress.failStage(stage, String(err));
      throw err;
    }

    // Check gate
    const gate = checkGate(stage, result, state);
    if (!gate.passed) {
      await progress.failStage(stage, `Gate failed: ${gate.reason}`);
      throw new Error(`Gate failed at ${stage}: ${gate.reason}`);
    }

    // Save stage output
    (state.stage_outputs as Record<string, unknown>)[stage] = result;
    state.current_stage = (STAGE_NAMES[i + 1] as StageName) ?? 'done';
    saveState(state);
    await progress.completeStage(stage);
  }

  // Done
  state.status = 'completed';
  state.current_stage = 'done';
  saveState(state);

  const filePath = state.stage_outputs.export?.file_path ?? '';
  const url = state.stage_outputs.report?.notion_url ?? 'no URL';
  await progress.complete(`Enrichment complete. File: ${filePath}. Report: ${url}`);

  return {
    status: 'completed',
    runId: state.run_id,
    enrichedFilePath: filePath,
    notionUrl: url,
  };
}
