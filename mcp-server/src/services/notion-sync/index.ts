/**
 * Notion Sync Service - Aggregated Exports
 */

import type { BacklogType } from '@elio/db';
import { syncAllToNotion } from './sync-to.js';
import { syncFromNotion } from './sync-from.js';

export { syncItemToNotion, syncAllToNotion } from './sync-to.js';
export { syncFromNotion } from './sync-from.js';

/**
 * Full bidirectional sync
 */
export async function fullSync(type?: BacklogType): Promise<{
  toNotion: { synced: number; errors: number };
  fromNotion: { updated: number; created: number; errors: number };
}> {
  const types: BacklogType[] = type ? [type] : ['technical', 'product'];

  const toNotion = { synced: 0, errors: 0 };
  const fromNotion = { updated: 0, created: 0, errors: 0 };

  for (const t of types) {
    // First sync local → Notion
    const toResult = await syncAllToNotion(t);
    toNotion.synced += toResult.synced;
    toNotion.errors += toResult.errors;

    // Then sync Notion → local
    const fromResult = await syncFromNotion(t);
    fromNotion.updated += fromResult.updated;
    fromNotion.created += fromResult.created;
    fromNotion.errors += fromResult.errors;
  }

  return { toNotion, fromNotion };
}
