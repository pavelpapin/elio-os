/**
 * Stage: Verify — build + test after fixes
 */

import type { ExecutionContext } from '../orchestrator/types.js';
import { verify } from '../verify.js';

export async function executeVerify(ctx: ExecutionContext): Promise<unknown> {
  const fixData = ctx.stageOutputs.get('fix')?.data as { headBefore: string } | undefined;
  if (!fixData) throw new Error('Fix output not found');

  ctx.logger.info('Verifying build and tests');
  const result = verify(ctx.basePath, fixData.headBefore);
  ctx.logger.info('Verification done', { build: result.buildPassed, tests: result.testsPassed });
  return result;
}
