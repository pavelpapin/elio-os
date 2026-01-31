/**
 * Notion API Helpers
 */

import * as fs from 'fs';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export function getNotionKey(): string {
  const path = '/root/.claude/secrets/notion.json';
  if (!fs.existsSync(path)) {
    throw new Error('Notion credentials not found');
  }
  const creds = JSON.parse(fs.readFileSync(path, 'utf-8'));
  return creds.api_key;
}

export async function notionRequest(
  endpoint: string,
  method: string = 'GET',
  body?: unknown
): Promise<unknown> {
  const apiKey = getNotionKey();

  const response = await fetch(`${NOTION_API}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export function markdownToBlocks(markdown: string): unknown[] {
  const blocks: unknown[] = [];
  const lines = markdown.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      blocks.push({
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: line.slice(2) } }]
        }
      });
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: line.slice(3) } }]
        }
      });
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push({
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: line.slice(4) } }]
        }
      });
      i++;
      continue;
    }

    if (line.startsWith('---')) {
      blocks.push({ type: 'divider', divider: {} });
      i++;
      continue;
    }

    if (line.startsWith('|')) {
      let tableContent = '';
      while (i < lines.length && lines[i].startsWith('|')) {
        tableContent += lines[i] + '\n';
        i++;
      }
      blocks.push({
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: tableContent.trim() } }],
          language: 'plain text'
        }
      });
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: line.slice(2) } }]
        }
      });
      i++;
      continue;
    }

    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      blocks.push({
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ type: 'text', text: { content: numberedMatch[2] } }]
        }
      });
      i++;
      continue;
    }

    if (line.startsWith('> ')) {
      blocks.push({
        type: 'quote',
        quote: {
          rich_text: [{ type: 'text', text: { content: line.slice(2) } }]
        }
      });
      i++;
      continue;
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3) || 'plain text';
      let codeContent = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeContent += lines[i] + '\n';
        i++;
      }
      i++;
      blocks.push({
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: codeContent.trim() } }],
          language: lang === 'typescript' ? 'typescript' : lang === 'json' ? 'json' : 'plain text'
        }
      });
      continue;
    }

    const content = line.slice(0, 2000);
    blocks.push({
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content } }]
      }
    });
    i++;
  }

  return blocks.slice(0, 100);
}

export function buildReportProperties(
  reportType: string,
  date: string
): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    'Date': {
      title: [{ type: 'text', text: { content: date } }]
    },
    'Status': {
      select: { name: 'Completed' }
    }
  };

  if (reportType === 'cto') {
    properties['Auto-Fixes Applied'] = { number: 1 };
  } else if (reportType === 'cpo') {
    properties['Auto-Fixes Applied'] = { number: 0 };
    properties['Proposals'] = { number: 4 };
  } else if (reportType === 'ceo') {
    properties['Mission Progress'] = { select: { name: 'Advancing' } };
    properties['Team Health'] = { select: { name: 'Healthy' } };
  }

  return properties;
}
