import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: '/root/.claude/mcp-server/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // List product backlog
  const { data: items, error } = await supabase
    .from('backlog_items')
    .select('*')
    .eq('backlog_type', 'product')
    .not('status', 'in', '("done","cancelled")')
    .order('priority', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('=== CURRENT PRODUCT BACKLOG ===');
  console.log('Count:', items ? items.length : 0);
  if (items && items.length > 0) {
    items.forEach(function(item) {
      const priority = item.priority ? item.priority.toUpperCase() : 'MEDIUM';
      console.log('\n[' + priority + '] ' + item.title);
      console.log('  ID: ' + item.id);
      console.log('  Status: ' + item.status);
      console.log('  Category: ' + (item.category || 'N/A'));
      console.log('  Effort: ' + (item.effort || 'N/A'));
    });
  } else {
    console.log('No active product backlog items');
  }
}

main().catch(console.error);
