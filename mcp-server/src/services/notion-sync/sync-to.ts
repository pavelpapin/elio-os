/**
 * Notion Sync - Sync To Notion
 */

import { getDb, BacklogItem, BacklogType } from '@elio/db';
import { createLogger } from '@elio/shared';
import { NOTION_DBS, NotionPage } from './config.js';
import { notionRequest } from './api.js';
import { mapPriorityToNotion, mapStatusToNotion, mapSourceToNotion } from './mappers.js';

const logger = createLogger('notion-sync');

/**
 * Create Notion page from backlog item
 */
export async function syncItemToNotion(item: BacklogItem): Promise<{ pageId: string; url: string }> {
  const dbId = NOTION_DBS[item.backlog_type];

  const properties: Record<string, unknown> = {
    'Task': {
      title: [{ text: { content: item.title } }]
    },
    'Priority': {
      select: { name: mapPriorityToNotion(item.priority) }
    },
    'Status': {
      select: { name: mapStatusToNotion(item.status) }
    }
  };

  // Add optional fields
  if (item.category) {
    properties['Category'] = { select: { name: item.category } };
  }

  if (item.effort) {
    properties['Effort'] = { select: { name: item.effort.toUpperCase() } };
  }

  if (item.description) {
    properties['Description'] = {
      rich_text: [{ text: { content: item.description.slice(0, 2000) } }]
    };
  }

  properties['Source'] = { select: { name: mapSourceToNotion(item.source) } };

  // For product backlog, add user quote and impact
  if (item.backlog_type === 'product') {
    if (item.source_quote) {
      properties['User Quote'] = {
        rich_text: [{ text: { content: item.source_quote.slice(0, 2000) } }]
      };
    }
    if (item.impact) {
      properties['Impact'] = { select: { name: item.impact.charAt(0).toUpperCase() + item.impact.slice(1) } };
    }
  }

  let pageId: string;
  let url: string;

  if (item.notion_page_id) {
    // Update existing page
    logger.info('Updating Notion page', { pageId: item.notion_page_id, title: item.title });

    const response = await notionRequest(
      `/pages/${item.notion_page_id}`,
      'PATCH',
      { properties }
    ) as NotionPage;

    pageId = response.id;
    url = response.url;
  } else {
    // Create new page
    logger.info('Creating Notion page', { title: item.title, dbId });

    const response = await notionRequest(
      '/pages',
      'POST',
      {
        parent: { database_id: dbId },
        properties
      }
    ) as NotionPage;

    pageId = response.id;
    url = response.url;
  }

  // Update local record with Notion info
  const db = getDb();
  await db.backlog.updateNotionSync(item.id, pageId, dbId, url);

  logger.info('Synced to Notion', { itemId: item.id, pageId, url });

  return { pageId, url };
}

/**
 * Sync all unsynced items to Notion
 */
export async function syncAllToNotion(type?: BacklogType): Promise<{ synced: number; errors: number }> {
  const db = getDb();
  const items = await db.backlog.getUnsyncedItems(type);

  let synced = 0;
  let errors = 0;

  for (const item of items) {
    try {
      await syncItemToNotion(item);
      synced++;
    } catch (error) {
      logger.error('Failed to sync item to Notion', { itemId: item.id, error });
      errors++;
    }
  }

  logger.info('Sync to Notion complete', { synced, errors });
  return { synced, errors };
}
