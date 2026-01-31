/**
 * Notion Client - Block Operations and Search
 */

import { notionRequest, extractTitle, extractPlainText } from './api.js';
import type {
  NotionPage, NotionDatabase, NotionBlock, BlockType,
  NotionPageResponse, NotionBlocksResponse, NotionSearchResponse
} from './types.js';

export async function getBlocks(pageId: string): Promise<NotionBlock[]> {
  const response = await notionRequest(`/blocks/${pageId}/children`) as NotionBlocksResponse;

  return response.results.map(block => {
    const blockContent = block[block.type] as { rich_text?: Array<{ plain_text: string }> };
    let content = '';

    if (blockContent?.rich_text) {
      content = extractPlainText(blockContent.rich_text);
    }

    return { id: block.id, type: block.type, content };
  });
}

export async function appendBlock(
  pageId: string,
  content: string,
  type: BlockType = 'paragraph'
): Promise<NotionBlock> {
  const block: Record<string, unknown> = {
    object: 'block',
    type,
    [type]: {
      rich_text: [{ type: 'text', text: { content } }]
    }
  };

  if (type === 'to_do') {
    (block[type] as Record<string, unknown>).checked = false;
  }

  const response = await notionRequest(`/blocks/${pageId}/children`, 'PATCH', {
    children: [block]
  }) as { results: Array<{ id: string; type: string }> };

  return { id: response.results[0].id, type: response.results[0].type, content };
}

export async function search(query: string, filter?: 'page' | 'database'): Promise<Array<NotionPage | NotionDatabase>> {
  const body: Record<string, unknown> = { query, page_size: 20 };

  if (filter) {
    body.filter = { property: 'object', value: filter };
  }

  const response = await notionRequest('/search', 'POST', body) as NotionSearchResponse;

  return response.results.map(item => {
    if (item.object === 'database') {
      return {
        id: item.id,
        title: item.title?.map(t => t.plain_text).join('') || '(untitled)',
        url: item.url,
        properties: item.properties || {}
      } as NotionDatabase;
    } else {
      return {
        id: item.id,
        title: extractTitle(item.properties || {}),
        url: item.url,
        createdTime: item.created_time || '',
        lastEditedTime: item.last_edited_time || '',
        properties: item.properties || {}
      } as NotionPage;
    }
  });
}
