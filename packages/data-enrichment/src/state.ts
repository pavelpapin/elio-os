/**
 * State persistence — atomic save/load of PipelineState to disk
 */

import { writeFileSync, readFileSync, mkdirSync, renameSync, readdirSync, existsSync } from 'fs';
import { PipelineStateSchema } from './types.js';
import type { PipelineState } from './types.js';

const BASE_DIR = '/root/.claude/logs/workflows/data-enrichment';

function runDir(runId: string): string {
  return `${BASE_DIR}/${runId}`;
}

function statePath(runId: string): string {
  return `${runDir(runId)}/state.json`;
}

export function saveState(state: PipelineState): void {
  const dir = runDir(state.run_id);
  mkdirSync(dir, { recursive: true });

  state.updated_at = new Date().toISOString();
  const tmp = `${statePath(state.run_id)}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, statePath(state.run_id));
}

export function loadState(runId: string): PipelineState | null {
  const path = statePath(runId);
  if (!existsSync(path)) return null;

  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  const result = PipelineStateSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function createInitialState(inputSource: string): PipelineState {
  const runId = `enrich_${Date.now()}`;
  return {
    run_id: runId,
    input_source: inputSource,
    current_stage: 'discovery',
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'running',
    stage_outputs: {},
  };
}

export function listActiveRuns(): string[] {
  if (!existsSync(BASE_DIR)) return [];
  return readdirSync(BASE_DIR)
    .filter((dir) => {
      const state = loadState(dir);
      return state && state.status !== 'completed' && state.status !== 'failed';
    });
}

export function getRunDir(runId: string): string {
  return runDir(runId);
}
