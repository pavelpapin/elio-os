/**
 * Stage 7: Review — Consilium (multi-model) or Claude-only review
 */

import { runConsilium } from '../consilium.js';
import type { PipelineState } from '../types.js';
import { readFileSync } from 'fs';

export async function execute(state: PipelineState): Promise<unknown> {
  const reportPath = `/root/.claude/logs/workflows/deep-research/${state.run_id}/report.md`;
  const reportContent = readFileSync(reportPath, 'utf-8');
  const brief = state.stage_outputs.discovery!;

  return runConsilium(reportContent, brief);
}
