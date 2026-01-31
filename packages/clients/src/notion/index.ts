/**
 * Notion Integration
 * Read/write databases, pages, and blocks
 */

import { notionRequest, extractTitle } from './api.js';
import type {
  NotionPage,
  NotionDatabase,
  NotionDatabaseResponse,
  NotionPageResponse,
} from './types.js';

export type { NotionPage, NotionDatabase, NotionBlock, BlockType } from './types.js';
export { isAuthenticated, propertyHelpers } from './api.js';
export { getBlocks, appendBlock, search } from './blocks.js';

// Database operations

export async function listDatabases(): Promise<NotionDatabase[]> {
  const response = await notionRequest('/search', 'POST', {
    filter: { property: 'object', value: 'database' },
    page_size: 100
  }) as { results: NotionDatabaseResponse[] };

  return response.results.map(db => ({
    id: db.id,
    title: db.title?.map(t => t.plain_text).join('') || '(untitled)',
    url: db.url,
    properties: db.properties
  }));
}

export async function queryDatabase(
  databaseId: string,
  filter?: Record<string, unknown>,
  sorts?: Array<{ property: string; direction: 'ascending' | 'descending' }>
): Promise<NotionPage[]> {
  const body: Record<string, unknown> = { page_size: 100 };
  if (filter) body.filter = filter;
  if (sorts) body.sorts = sorts;

  const response = await notionRequest(
    `/databases/${databaseId}/query`,
    'POST',
    body
  ) as { results: NotionPageResponse[] };

  return response.results.map(page => ({
    id: page.id,
    title: extractTitle(page.properties),
    url: page.url,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
    properties: page.properties
  }));
}

export async function getDatabase(databaseId: string): Promise<NotionDatabase> {
  const db = await notionRequest(`/databases/${databaseId}`) as NotionDatabaseResponse;

  return {
    id: db.id,
    title: db.title?.map(t => t.plain_text).join('') || '(untitled)',
    url: db.url,
    properties: db.properties
  };
}

// Page operations

export async function getPage(pageId: string): Promise<NotionPage> {
  const page = await notionRequest(`/pages/${pageId}`) as NotionPageResponse;

  return {
    id: page.id,
    title: extractTitle(page.properties),
    url: page.url,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
    properties: page.properties
  };
}

export async function createPage(
  databaseId: string,
  properties: Record<string, unknown>
): Promise<NotionPage> {
  const page = await notionRequest('/pages', 'POST', {
    parent: { database_id: databaseId },
    properties
  }) as NotionPageResponse;

  return {
    id: page.id,
    title: extractTitle(page.properties),
    url: page.url,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
    properties: page.properties
  };
}

export async function updatePage(
  pageId: string,
  properties: Record<string, unknown>
): Promise<NotionPage> {
  const { archived, icon, cover, ...props } = properties;
  const body: Record<string, unknown> = { properties: props };
  if (archived !== undefined) body.archived = archived;
  if (icon !== undefined) body.icon = icon;
  if (cover !== undefined) body.cover = cover;

  const page = await notionRequest(`/pages/${pageId}`, 'PATCH', body) as NotionPageResponse;

  return {
    id: page.id,
    title: extractTitle(page.properties),
    url: page.url,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
    properties: page.properties
  };
}
