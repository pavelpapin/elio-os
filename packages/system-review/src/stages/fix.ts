/**
 * Stage: Fix — apply safe auto-fixes
 */

import type { ExecutionContext } from '../orchestrator/types.js';
import type { FixPlan, ReviewData } from '../types.js';
import { applyFixes } from '../fixers/index.js';
import { exec } from '../exec.js';

export async function executeFix(ctx: ExecutionContext): Promise<unknown> {
  const plan = ctx.stageOutputs.get('analyze')?.data as FixPlan | undefined;
  if (!plan) throw new Error('Analyze output not found');

  const reviewData = ctx.stageOutputs.get('collect')?.data as ReviewData | undefined;
  const headBefore = exec(`git -C ${ctx.basePath} rev-parse HEAD`).stdout;
  const autoFixes = plan.actions.filter((a) => a.type === 'auto-fix');

  ctx.logger.info('Applying fixes', { autoFixCount: autoFixes.length });
  const results = await applyFixes(plan, ctx.basePath, reviewData);
  const fixesApplied = results.some((r) => r.success);

  ctx.logger.info('Fixes applied', {
    success: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  });
  return {
    results,
    headBefore,
    fixesApplied,
    // Pass through so self-heal can re-create fix actions
    plan,
    reviewData,
  };
}
