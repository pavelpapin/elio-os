/**
 * Backlog Sync - Notion API helpers & property builders
 */

import {
  NOTION_API, NOTION_VERSION,
  getNotionKey,
  statusToNotion, statusFromNotion,
  priorityToNotion, sourceToNotion,
  type BacklogItem, type BacklogStatus, type BacklogPriority
} from './config.js';

export async function notionRequest(endpoint: string, method = 'GET', body?: unknown): Promise<unknown> {
  const response = await fetch(`${NOTION_API}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${getNotionKey()}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API ${response.status}: ${error}`);
  }

  return response.json();
}

export function buildNotionProperties(item: BacklogItem): Record<string, unknown> {
  const props: Record<string, unknown> = {
    'Task': { title: [{ text: { content: item.title } }] },
    'Priority': { select: { name: priorityToNotion[item.priority] } },
    'Status': { select: { name: statusToNotion[item.status] } },
    'Source': { select: { name: sourceToNotion[item.source] || 'Manual' } }
  };

  if (item.category) {
    props['Category'] = { select: { name: item.category } };
  }
  if (item.effort && item.backlog_type === 'technical') {
    props['Effort'] = { select: { name: item.effort.toUpperCase() } };
  }
  if (item.description) {
    props['Description'] = { rich_text: [{ text: { content: item.description.slice(0, 2000) } }] };
  }
  if (item.backlog_type === 'product') {
    if (item.source_quote) {
      props['User Quote'] = { rich_text: [{ text: { content: item.source_quote.slice(0, 2000) } }] };
    }
    if (item.impact) {
      props['Impact'] = { select: { name: item.impact.charAt(0).toUpperCase() + item.impact.slice(1) } };
    }
  }

  return props;
}

export function extractNotionStatus(props: Record<string, unknown>): BacklogStatus | null {
  const statusProp = props['Status'] as { select?: { name: string } } | undefined;
  const statusName = statusProp?.select?.name;
  return statusName ? (statusFromNotion[statusName] || null) : null;
}

export function extractFromNotion(props: Record<string, unknown>): {
  title: string;
  status: BacklogStatus;
  priority: BacklogPriority;
  category?: string;
  description?: string;
  effort?: string;
  source?: string;
} {
  const titleProp = props['Task'] as { title?: Array<{ plain_text: string }> };
  const title = titleProp?.title?.[0]?.plain_text || 'Untitled';

  const statusProp = props['Status'] as { select?: { name: string } };
  const status = statusFromNotion[statusProp?.select?.name || ''] || 'backlog';

  const priorityProp = props['Priority'] as { select?: { name: string } };
  const priorityName = priorityProp?.select?.name?.toLowerCase() || 'medium';
  const priority = (['critical', 'high', 'medium', 'low'].includes(priorityName)
    ? priorityName : 'medium') as BacklogPriority;

  const categoryProp = props['Category'] as { select?: { name: string } };
  const category = categoryProp?.select?.name;

  const descProp = props['Description'] as { rich_text?: Array<{ plain_text: string }> };
  const description = descProp?.rich_text?.[0]?.plain_text;

  const effortProp = props['Effort'] as { select?: { name: string } };
  const effort = effortProp?.select?.name?.toLowerCase();

  const sourceProp = props['Source'] as { select?: { name: string } };
  const sourceMap: Record<string, string> = {
    'CTO Review': 'cto_review',
    'CPO Review': 'cpo_review',
    'Manual': 'manual',
    'Bug Report': 'bug_report'
  };
  const source = sourceMap[sourceProp?.select?.name || ''] || 'manual';

  return { title, status, priority, category, description, effort, source };
}
