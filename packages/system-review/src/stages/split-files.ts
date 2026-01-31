/**
 * Stage: Split Files — split oversized files (>200 lines) via Claude API
 * Runs between Fix and Verify with a 3-hour timeout.
 */

import type { ExecutionContext } from '../orchestrator/types.js';
import type { ReviewData } from '../types.js';
import { splitOversizedFiles } from '../fixers/file-split.js';

export async function executeSplitFiles(ctx: ExecutionContext): Promise<unknown> {
  const reviewData = ctx.stageOutputs.get('collect')?.data as ReviewData | undefined;
  if (!reviewData) throw new Error('Collect output not found');

  const oversized = reviewData.architecture.oversizedFiles;
  if (oversized.length === 0) {
    ctx.logger.info('No oversized files to split');
    return { results: [], splitCount: 0, totalFiles: 0 };
  }

  ctx.logger.info('Splitting oversized files', {
    count: oversized.length,
    files: oversized.map(f => `${f.path} (${f.lines})`),
  });

  const result = await splitOversizedFiles(
    ctx.basePath,
    oversized,
    (file, status) => {
      ctx.logger.info(`Split: ${file} → ${status}`);
    },
  );

  ctx.logger.info('File splitting complete', {
    success: result.success,
    description: result.description,
  });

  return {
    results: [result],
    splitCount: result.success ? 1 : 0,
    totalFiles: oversized.length,
    fixesApplied: result.success,
  };
}
