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
import { PausedForInput } from './stages/discovery.js';
import type { ProgressAdapter } from '@elio/workflow';

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

/**
 * Execute deep research pipeline.
 * Called by BullMQ worker — all progress goes through the adapter.
 */
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
    await progress.startStage(stage, `Stage ${i + 1}/${STAGE_NAMES.length}`);

    let result: unknown;
    try {
      const mod = await import(`./stages/${stage.replace('_', '-')}.js`);
      result = await mod.execute(state);
    } catch (err) {
      if (err instanceof PausedForInput || (err && typeof err === 'object' && 'questions' in err && err.constructor?.name === 'PausedForInput')) {
        state.status = 'paused_for_input';
        state.current_stage = stage;
        saveState(state);

        const questionsPath = `/root/.claude/logs/workflows/deep-research/${state.run_id}/questions.json`;
        writeFileSync(questionsPath, JSON.stringify(err.questions, null, 2));

        await progress.requestInput(JSON.stringify(err.questions));

        return {
          status: 'paused_for_input',
          runId: state.run_id,
          questions: err.questions,
          resumeCommand: `elio job create workflow:deep-research --resume ${state.run_id} --input answers.json`,
        };
      }
      await progress.failStage(stage, String(err));
      throw err;
    }

    // Check gate
    const gate = checkGate(stage, result, state);
    if (!gate.passed) {
      if (stage === 'review' && gate.reason === 'needs_revision' && state.iteration < state.max_iterations) {
        await progress.log(`Review needs revision (iteration ${state.iteration + 1}/${state.max_iterations})`);
        state.iteration++;
        state.stage_outputs.review = result as PipelineState['stage_outputs']['review'];
        state.current_stage = 'synthesis';
        saveState(state);
        i = STAGE_NAMES.indexOf('synthesis') - 1;
        continue;
      }
      await progress.failStage(stage, `Gate failed: ${gate.reason}`);
      throw new Error(`Gate failed at ${stage}: ${gate.reason}`);
    }

    // Save stage output
    (state.stage_outputs as Record<string, unknown>)[stage] = result;
    state.current_stage = (STAGE_NAMES[i + 1] as StageName) ?? 'done';
    saveState(state);
    await progress.completeStage(stage);

    // Iterative deepening: after first synthesis, if gaps found, run targeted collection
    if (stage === 'synthesis' && state.iteration === 0) {
      const synthesis = result as { gaps_for_deepdive?: string[] };
      const gaps = synthesis.gaps_for_deepdive;
      if (gaps && gaps.length > 0) {
        await progress.log(`Deep dive: ${gaps.length} gaps identified, running targeted collection...`);
        try {
          const { executeTargetedCollection } = await import('./stages/collection.js');
          const deepDiveResult = await executeTargetedCollection(state, gaps);
          // Merge deep dive facts into existing collection
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
    }
  }

  // Done
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
