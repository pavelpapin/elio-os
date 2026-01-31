/**
 * Stage: Collect — gather system health data
 */

import type { ExecutionContext } from '../orchestrator/types.js';
import { collectAll } from '../collectors/index.js';

export async function executeCollect(ctx: ExecutionContext): Promise<unknown> {
  ctx.logger.info('Collecting system health data');
  const data = await collectAll(ctx.basePath);
  ctx.logger.info('Collection complete', { timestamp: data.timestamp });
  return data;
}
