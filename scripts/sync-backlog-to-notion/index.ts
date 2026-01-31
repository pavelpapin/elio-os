#!/usr/bin/env npx tsx
/**
 * Bidirectional Backlog Sync
 *
 * Full sync between Supabase and Notion:
 * 1. Create new Notion pages for unsynced items
 * 2. Update Notion pages with local status changes
 * 3. Pull status changes from Notion to local DB
 *
 * Usage: npx tsx scripts/sync-backlog-to-notion/index.ts [--direction=full|to-notion|from-notion]
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  NOTION_DBS, getSupabaseConfig, delay,
  statusToNotion, priorityToNotion,
  type BacklogItem, type NotionPage, type SyncResult
} from './config.js';
import { notionRequest, buildNotionProperties } from './notion-api.js';
import { syncFromNotion } from './sync-from-notion.js';

async function syncNewToNotion(supabase: SupabaseClient): Promise<SyncResult> {
  console.log('\n📤 Phase 1: Creating new Notion pages...');

  const { data: items, error } = await supabase
    .from('backlog_items')
    .select('*')
    .is('notion_page_id', null);

  if (error) throw error;
  if (!items?.length) {
    console.log('   No new items to create');
    return { created: 0, updated: 0, errors: 0 };
  }

  console.log(`   Found ${items.length} new items`);
  let created = 0, errors = 0;

  for (const item of items as BacklogItem[]) {
    try {
      const dbId = NOTION_DBS[item.backlog_type];
      const response = await notionRequest('/pages', 'POST', {
        parent: { database_id: dbId },
        properties: buildNotionProperties(item)
      }) as NotionPage;

      await supabase.from('backlog_items').update({
        notion_page_id: response.id,
        notion_db_id: dbId,
        notion_url: response.url,
        notion_synced_at: new Date().toISOString()
      }).eq('id', item.id);

      console.log(`   + ${item.title}`);
      created++;
      await delay(350);
    } catch (err) {
      console.log(`   ! ${item.title}: ${err instanceof Error ? err.message : err}`);
      errors++;
    }
  }

  return { created, updated: 0, errors };
}

async function syncUpdatesToNotion(supabase: SupabaseClient): Promise<SyncResult> {
  console.log('\n📤 Phase 2: Pushing local changes to Notion...');

  const { data: items, error } = await supabase
    .from('backlog_items')
    .select('*')
    .not('notion_page_id', 'is', null);

  if (error) throw error;
  if (!items?.length) {
    console.log('   No synced items found');
    return { created: 0, updated: 0, errors: 0 };
  }

  let updated = 0, errors = 0;

  for (const item of items as BacklogItem[]) {
    const localUpdated = new Date(item.updated_at || 0).getTime();
    const lastSync = new Date(item.notion_synced_at || 0).getTime();

    if (localUpdated <= lastSync) continue;

    try {
      await notionRequest(`/pages/${item.notion_page_id}`, 'PATCH', {
        properties: {
          'Status': { select: { name: statusToNotion[item.status] } },
          'Priority': { select: { name: priorityToNotion[item.priority] } }
        }
      });

      await supabase.from('backlog_items').update({
        notion_synced_at: new Date().toISOString()
      }).eq('id', item.id);

      console.log(`   ~ ${item.title} → ${item.status}`);
      updated++;
      await delay(350);
    } catch (err) {
      console.log(`   ! ${item.title}: ${err instanceof Error ? err.message : err}`);
      errors++;
    }
  }

  if (updated === 0) console.log('   No local changes to push');
  return { created: 0, updated, errors };
}

// ============ MAIN ============

async function main() {
  const direction = process.argv.find(a => a.startsWith('--direction='))?.split('=')[1] || 'full';

  console.log('═'.repeat(50));
  console.log(`🔄 Backlog Sync (${direction})`);
  console.log('═'.repeat(50));

  const sbConfig = getSupabaseConfig();
  const supabase = createClient(sbConfig.url, sbConfig.key);

  const results: SyncResult = { created: 0, updated: 0, errors: 0 };

  if (direction === 'full' || direction === 'to-notion') {
    const r1 = await syncNewToNotion(supabase);
    const r2 = await syncUpdatesToNotion(supabase);
    results.created += r1.created;
    results.updated += r1.updated + r2.updated;
    results.errors += r1.errors + r2.errors;
  }

  if (direction === 'full' || direction === 'from-notion') {
    const r3 = await syncFromNotion(supabase);
    results.created += r3.created;
    results.updated += r3.updated;
    results.errors += r3.errors;
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`✅ Done: ${results.created} created, ${results.updated} updated, ${results.errors} errors`);
  console.log('═'.repeat(50));

  return results;
}

main()
  .then(r => process.exit(r.errors > 0 ? 1 : 0))
  .catch(err => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  });
