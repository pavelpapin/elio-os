/**
 * Stage result merging logic (for crash recovery)
 */

import { saveState } from './state.js';
import type { PipelineState, StageName } from './types.js';
import type { ProgressAdapter } from '@elio/workflow';

/**
 * Save stage output with merge logic for collection stage
 */
export async function saveStageOutput(
  stage: StageName,
  result: unknown,
  state: PipelineState,
  progress: ProgressAdapter,
): Promise<void> {
  if (stage === 'collection') {
    const existing = state.stage_outputs.collection;
    if (existing && result && typeof result === 'object' && 'agents' in result) {
      // Merge agent results, dedupe by agent name
      const existingAgents = new Set(existing.agents.map((a: { agent: string }) => a.agent));
      const newAgents = (result.agents as Array<{ agent: string }>).filter(
        (a) => !existingAgents.has(a.agent)
      );
      (state.stage_outputs as Record<string, unknown>)[stage] = {
        agents: [...existing.agents, ...newAgents],
      };
      await progress.log(`Merged ${newAgents.length} new agent results (total: ${existing.agents.length + newAgents.length})`);
    } else {
      (state.stage_outputs as Record<string, unknown>)[stage] = result;
    }
  } else {
    (state.stage_outputs as Record<string, unknown>)[stage] = result;
  }

  state.last_checkpoint_at = new Date().toISOString();
  saveState(state);
}
