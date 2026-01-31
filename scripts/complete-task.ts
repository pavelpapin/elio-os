#!/usr/bin/env npx tsx
/**
 * Mark backlog task as done and sync to Notion
 * Usage: npx tsx scripts/complete-task.ts "task title pattern"
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

const NOTION_DBS: Record<string, string> = {
  technical: '2ef33fbf-b00e-810b-aea3-cafeff3d9462',
  product: '2ef33fbf-b00e-813c-b77a-c9ab4d9450c3'
};

function getSupabaseConfig() {
  const creds = JSON.parse(fs.readFileSync('/root/.claude/secrets/supabase.json', 'utf-8'));
  return { url: creds.url, key: creds.service_role_key };
}

function getNotionKey(): string {
  const creds = JSON.parse(fs.readFileSync('/root/.claude/secrets/notion.json', 'utf-8'));
  return creds.api_key;
}

async function notionUpdate(pageId: string, status: string): Promise<void> {
  const response = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${getNotionKey()}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION
    },
    body: JSON.stringify({
      properties: {
        'Status': { select: { name: status } }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Notion update failed: ${response.status}`);
  }
}

async function main() {
  const pattern = process.argv[2];
  if (!pattern) {
    console.log('Usage: npx tsx scripts/complete-task.ts "task title pattern"');
    console.log('       npx tsx scripts/complete-task.ts --all  (mark all in_progress as done)');
    process.exit(1);
  }

  const sbConfig = getSupabaseConfig();
  const supabase = createClient(sbConfig.url, sbConfig.key);

  // Find matching tasks
  let query = supabase
    .from('backlog_items')
    .select('*')
    .not('status', 'in', '("done","cancelled")');

  if (pattern !== '--all') {
    query = query.ilike('title', `%${pattern}%`);
  } else {
    // Only in_progress tasks
    query = query.eq('status', 'in_progress');
  }

  const { data: items, error } = await query;
  if (error) throw error;

  if (!items?.length) {
    console.log('No matching tasks found');
    process.exit(0);
  }

  console.log(`Found ${items.length} task(s):\n`);

  for (const item of items) {
    console.log(`  [${item.status}] ${item.title}`);
  }

  console.log('\nMarking as done...\n');

  for (const item of items) {
    // Update local DB
    const { error: updateError } = await supabase
      .from('backlog_items')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id);

    if (updateError) {
      console.log(`  ✗ DB update failed: ${item.title}`);
      continue;
    }

    // Sync to Notion
    if (item.notion_page_id) {
      try {
        await notionUpdate(item.notion_page_id, 'Done');
        await supabase
          .from('backlog_items')
          .update({ notion_synced_at: new Date().toISOString() })
          .eq('id', item.id);
        console.log(`  ✓ ${item.title} → Done (synced)`);
      } catch (err) {
        console.log(`  ✓ ${item.title} → Done (Notion sync failed)`);
      }
    } else {
      console.log(`  ✓ ${item.title} → Done (no Notion page)`);
    }
  }

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
