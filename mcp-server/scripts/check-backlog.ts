/**
 * Check current product backlog
 */

import { getDb } from '../src/db/index.js';

async function main() {
  const db = getDb();

  // Get active product backlog items
  const items = await db.backlog.getActive('product');

  console.log('=== CURRENT PRODUCT BACKLOG ===');
  console.log('Count:', items.length);

  if (items.length > 0) {
    items.forEach((item) => {
      const priority = item.priority ? item.priority.toUpperCase() : 'MEDIUM';
      console.log('\n[' + priority + '] ' + item.title);
      console.log('  ID: ' + item.id);
      console.log('  Status: ' + item.status);
      console.log('  Category: ' + (item.category || 'N/A'));
      console.log('  Effort: ' + (item.effort || 'N/A'));
      console.log('  Impact: ' + (item.impact || 'N/A'));
    });
  } else {
    console.log('No active product backlog items');
  }

  // Also show stats
  console.log('\n=== BACKLOG STATS ===');
  const stats = await db.backlog.getStats();
  console.log(JSON.stringify(stats, null, 2));
}

main().catch(console.error);
