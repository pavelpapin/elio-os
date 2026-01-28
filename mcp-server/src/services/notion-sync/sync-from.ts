/**
 * Notion Sync - Sync From Notion
 */

import { getDb, BacklogItem, BacklogType } from '@elio/db';
import { createLogger } from '@elio/shared';
import { NOTION_DBS, NotionPage } from './config.js';
import { notionRequest } from './api.js';
import { mapPriorityFromNotion, mapStatusFromNotion } from './mappers.js';

const logger = createLogger('notion-sync');

/**
 * Fetch updates from Notion and sync to local DB
 */
export async function syncFromNotion(type: BacklogType): Promise<{ updated: number; created: number; errors: number }> {
  const db = getDb();
  const dbId = NOTION_DBS[type];

  // Query Notion database
  const response = await notionRequest(
    `/databases/${dbId}/query`,
    'POST',
    {
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      page_size: 100
    }
  ) as { results: NotionPage[] };

  let updated = 0;
  let created = 0;
  let errors = 0;

  for (const page of response.results) {
    try {
      const props = page.properties as Record<string, {
        title?: Array<{ plain_text: string }>;
        select?: { name: string };
        rich_text?: Array<{ plain_text: string }>;
      }>;

      // Extract title
      const titleProp = props['Task']?.title;
      const title = titleProp?.[0]?.plain_text;
      if (!title) continue;

      // Extract other fields
      const priority = props['Priority']?.select?.name;
      const status = props['Status']?.select?.name;
      const category = props['Category']?.select?.name;
      const description = props['Description']?.rich_text?.[0]?.plain_text;
      const effort = props['Effort']?.select?.name?.toLowerCase();

      // Check if item exists locally
      const existingItem = await db.backlog.getByNotionPageId(page.id);

      if (existingItem) {
        // Update existing item
        const updateData: Partial<BacklogItem> = {
          title,
          priority: priority ? mapPriorityFromNotion(priority) : existingItem.priority,
          status: status ? mapStatusFromNotion(status) : existingItem.status,
          category: category || existingItem.category,
          description: description || existingItem.description,
          notion_synced_at: new Date().toISOString()
        };

        if (effort && ['xs', 's', 'm', 'l', 'xl'].includes(effort)) {
          updateData.effort = effort as BacklogItem['effort'];
        }

        await db.backlog.update(existingItem.id, updateData);
        updated++;
      } else {
        // Create new item from Notion
        await db.backlog.createItem(title, type, {
          priority: priority ? mapPriorityFromNotion(priority) : 'medium',
          status: status ? mapStatusFromNotion(status) : 'backlog',
          category,
          description,
          effort: effort as BacklogItem['effort'],
          source: 'manual',
          notion_page_id: page.id,
          notion_db_id: dbId,
          notion_url: page.url,
          notion_synced_at: new Date().toISOString()
        });
        created++;
      }
    } catch (error) {
      logger.error('Failed to sync item from Notion', { pageId: page.id, error });
      errors++;
    }
  }

  logger.info('Sync from Notion complete', { type, updated, created, errors });
  return { updated, created, errors };
}
