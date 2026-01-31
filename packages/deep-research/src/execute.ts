/**
 * Deep Research — Library API for BullMQ worker
 *
 * Runs the research pipeline with ProgressReporter for state/streaming.
 * File-based state is kept as crash-recovery backup only.
 */

import { writeFileSync } from 'fs';
import { saveState, loadState, createInitialState } from './state.js';
import { checkGate } from './gates.js';
import { STAGE_NAMES } from './types.js';
import type { PipelineState, StageName } from './types.js';
import type { ProgressAdapter } from '@elio/workflow';
import { executeStage, checkStageAttempts } from './stage-runner.js';
import { saveStageOutput } from './result-merger.js';

export type { ProgressAdapter };

export interface DeepResearchParams {
  topic: string;
  resumeRunId?: string;
  userInputPath?: string;
}

export interface DeepResearchResult {
  status: 'completed' | 'paused_for_input' | 'failed';
  runId: string;
  notionUrl?: string;
  score?: number;
  questions?: unknown;
  resumeCommand?: string;
  error?: string;
}

export async function executeDeepResearch(
  params: DeepResearchParams,
  progress: ProgressAdapter,
): Promise<DeepResearchResult> {
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
      const destPath = `/root/.claude/logs/workflows/deep-research/${state.run_id}/user_input.json`;
      writeFileSync(destPath, readFileSync(params.userInputPath, 'utf-8'));
      state.status = 'running';
    }
  } else {
    state = createInitialState(params.topic);
    saveState(state);
  }

  await progress.start(`Deep Research: ${state.topic}`);
  await progress.setMetadata('runId', state.run_id);
  await progress.setMetadata('topic', state.topic);

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
): Promise<DeepResearchResult> {
  const startIdx = state.current_stage === 'done'
    ? STAGE_NAMES.length
    : STAGE_NAMES.indexOf(state.current_stage as StageName);

  for (let i = startIdx; i < STAGE_NAMES.length; i++) {
    const stage = STAGE_NAMES[i];

    await checkStageAttempts(stage, state, progress);
    await progress.startStage(stage, `Stage ${i + 1}/${STAGE_NAMES.length}`);

    const runResult = await executeStage(stage, state, progress);
    if (runResult.pausedForInput) return runResult.pausedForInput;

    const gate = checkGate(stage, runResult.result, state);
    if (!gate.passed) {
      if (stage === 'review' && gate.reason === 'needs_revision' && state.iteration < state.max_iterations) {
        await progress.log(`Review needs revision (iteration ${state.iteration + 1}/${state.max_iterations})`);
        state.iteration++;
        state.stage_outputs.review = runResult.result as PipelineState['stage_outputs']['review'];
        state.current_stage = 'synthesis';
        saveState(state);
        i = STAGE_NAMES.indexOf('synthesis') - 1;
        continue;
      }
      await progress.failStage(stage, `Gate failed: ${gate.reason}`);
      throw new Error(`Gate failed at ${stage}: ${gate.reason}`);
    }

    await saveStageOutput(stage, runResult.result, state, progress);
    state.current_stage = (STAGE_NAMES[i + 1] as StageName) ?? 'done';
    saveState(state);
    await progress.completeStage(stage);

    if (stage === 'synthesis' && state.iteration === 0) {
      await handleDeepDive(runResult.result, state, progress);
    }
  }

  return completePipeline(state, progress);
}

async function handleDeepDive(
  result: unknown,
  state: PipelineState,
  progress: ProgressAdapter,
): Promise<void> {
  const synthesis = result as { gaps_for_deepdive?: string[] };
  const gaps = synthesis.gaps_for_deepdive;
  if (!gaps || gaps.length === 0) return;

  await progress.log(`Deep dive: ${gaps.length} gaps identified, running targeted collection...`);
  try {
    const { executeTargetedCollection } = await import('./stages/collection.js');
    const deepDiveResult = await executeTargetedCollection(state, gaps);
    const existing = state.stage_outputs.collection;
    if (existing && deepDiveResult) {
      existing.agents.push(deepDiveResult as typeof existing.agents[number]);
      saveState(state);
    }
    await progress.log('Deep dive collection complete, facts merged.');
  } catch (err) {
    await progress.log(`Deep dive failed (non-critical): ${String(err)}`);
  }
}

async function completePipeline(
  state: PipelineState,
  progress: ProgressAdapter,
): Promise<DeepResearchResult> {
  state.status = 'completed';
  state.current_stage = 'done';
  saveState(state);

  const url = state.stage_outputs.report?.notion_url ?? 'no URL';
  const score = state.stage_outputs.review?.consensus_score ?? 0;
  await progress.complete(`Research complete. Score: ${score}. URL: ${url}`);

  return {
    status: 'completed',
    runId: state.run_id,
    notionUrl: url,
    score,
  };
}
