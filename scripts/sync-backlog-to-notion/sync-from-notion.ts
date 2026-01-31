/**
 * Sync From Notion - Pull changes from Notion to local DB
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { NOTION_DBS, type BacklogType, type NotionPage, type SyncResult } from './config.js';
import { notionRequest, extractFromNotion } from './notion-api.js';

export async function syncFromNotion(supabase: SupabaseClient): Promise<SyncResult> {
  console.log('\n📥 Phase 3: Pulling changes from Notion...');

  let created = 0, updated = 0, errors = 0;

  for (const [type, dbId] of Object.entries(NOTION_DBS)) {
    try {
      const response = await notionRequest(`/databases/${dbId}/query`, 'POST', {
        page_size: 100
      }) as { results: NotionPage[] };

      for (const page of response.results) {
        const props = page.properties as Record<string, unknown>;
        const extracted = extractFromNotion(props);

        const { data: localItem } = await supabase
          .from('backlog_items')
          .select('id, status, notion_synced_at')
          .eq('notion_page_id', page.id)
          .single();

        if (!localItem) {
          const { error } = await supabase.from('backlog_items').insert({
            title: extracted.title,
            backlog_type: type as BacklogType,
            status: extracted.status,
            priority: extracted.priority,
            category: extracted.category,
            description: extracted.description,
            effort: extracted.effort,
            source: extracted.source || 'manual',
            notion_page_id: page.id,
            notion_db_id: dbId,
            notion_url: page.url,
            notion_synced_at: new Date().toISOString()
          });

          if (error) {
            console.log(`   ! Create failed: ${extracted.title}: ${error.message}`);
            errors++;
          } else {
            console.log(`   + [${type}] ${extracted.title}`);
            created++;
          }
          continue;
        }

        const notionEdited = new Date(page.last_edited_time).getTime();
        const lastSync = new Date(localItem.notion_synced_at || 0).getTime();

        if (notionEdited > lastSync && localItem.status !== extracted.status) {
          await supabase.from('backlog_items').update({
            status: extracted.status,
            notion_synced_at: new Date().toISOString(),
            ...(extracted.status === 'done' ? { completed_at: new Date().toISOString() } : {})
          }).eq('id', localItem.id);

          console.log(`   ~ [${type}] ${page.id.slice(0, 8)}... → ${extracted.status}`);
          updated++;
        }
      }

      await new Promise(r => setTimeout(r, 350));
    } catch (err) {
      console.log(`   ! ${type}: ${err instanceof Error ? err.message : err}`);
      errors++;
    }
  }

  if (created === 0 && updated === 0) console.log('   No Notion changes to pull');
  return { created, updated, errors };
}
