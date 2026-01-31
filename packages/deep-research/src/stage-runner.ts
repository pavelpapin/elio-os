/**
 * Stage execution with timeout and attempt tracking
 */

import { writeFileSync } from 'fs';
import { saveState } from './state.js';
import type { PipelineState, StageName } from './types.js';
import { PausedForInput } from './stages/discovery.js';
import type { ProgressAdapter } from '@elio/workflow';
import type { DeepResearchResult } from './execute.js';

const STAGE_TIMEOUT_MS = 3600_000; // 1 hour

export interface StageRunResult {
  result: unknown;
  pausedForInput?: {
    status: 'paused_for_input';
    runId: string;
    questions: unknown;
    resumeCommand: string;
  };
}

/**
 * Execute a single stage with timeout protection
 */
export async function executeStage(
  stage: StageName,
  state: PipelineState,
  progress: ProgressAdapter,
): Promise<StageRunResult> {
  const stagePromise = (async () => {
    const mod = await import(`./stages/${stage.replace('_', '-')}.js`);
    return mod.execute(state);
  })();

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Stage ${stage} timeout after ${STAGE_TIMEOUT_MS}ms`)), STAGE_TIMEOUT_MS)
  );

  try {
    const result = await Promise.race([stagePromise, timeoutPromise]);
    return { result };
  } catch (err) {
    if (err instanceof PausedForInput || (err && typeof err === 'object' && 'questions' in err && err.constructor?.name === 'PausedForInput')) {
      state.status = 'paused_for_input';
      state.current_stage = stage;
      saveState(state);

      const questionsPath = `/root/.claude/logs/workflows/deep-research/${state.run_id}/questions.json`;
      writeFileSync(questionsPath, JSON.stringify(err.questions, null, 2));

      await progress.requestInput(JSON.stringify(err.questions));

      return {
        result: undefined,
        pausedForInput: {
          status: 'paused_for_input',
          runId: state.run_id,
          questions: err.questions,
          resumeCommand: `elio job create workflow:deep-research --resume ${state.run_id} --input answers.json`,
        },
      };
    }
    throw err;
  }
}

/**
 * Check and enforce stage attempt limits
 */
export async function checkStageAttempts(
  stage: StageName,
  state: PipelineState,
  progress: ProgressAdapter,
): Promise<void> {
  const attempts = state.stage_attempts[stage] || 0;
  if (attempts >= state.max_stage_attempts) {
    const errMsg = `Stage ${stage} failed ${attempts} times, aborting`;
    await progress.fail(errMsg);
    throw new Error(errMsg);
  }

  state.stage_attempts[stage] = attempts + 1;
  state.last_checkpoint_at = new Date().toISOString();
  saveState(state);
}
