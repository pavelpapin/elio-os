/**
 * Notion API Client
 * Low-level API interaction and data mapping
 */

import { BacklogPriority, BacklogStatus } from '../db/repositories/backlog-types.js';

// Notion DB IDs from team config
export const NOTION_DBS = {
  technical: '2ef33fbf-b00e-810b-aea3-cafeff3d9462',
  product: '2ef33fbf-b00e-813c-b77a-c9ab4d9450c3'
};

// API config
export const NOTION_API = 'https://api.notion.com/v1';
export const NOTION_VERSION = '2022-06-28';

export interface NotionPage {
  id: string;
  url: string;
  properties: Record<string, unknown>;
  last_edited_time: string;
}

/**
 * Get Notion API key from secrets
 */
export async function getApiKey(): Promise<string> {
  const fs = await import('fs');
  const path = '/root/.claude/secrets/notion.json';

  if (!fs.existsSync(path)) {
    throw new Error('Notion credentials not found');
  }

  const creds = JSON.parse(fs.readFileSync(path, 'utf-8'));
  return creds.api_key;
}

/**
 * Make Notion API request
 */
export async function notionRequest(
  endpoint: string,
  method: string = 'GET',
  body?: unknown
): Promise<unknown> {
  const apiKey = await getApiKey();

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

/**
 * Map local priority to Notion select
 */
export function mapPriorityToNotion(priority: BacklogPriority): string {
  const map: Record<BacklogPriority, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low'
  };
  return map[priority];
}

/**
 * Map Notion select to local priority
 */
export function mapPriorityFromNotion(notionPriority: string): BacklogPriority {
  const map: Record<string, BacklogPriority> = {
    'Critical': 'critical',
    'High': 'high',
    'Medium': 'medium',
    'Low': 'low'
  };
  return map[notionPriority] || 'medium';
}

/**
 * Map local status to Notion select
 */
export function mapStatusToNotion(status: BacklogStatus): string {
  const map: Record<BacklogStatus, string> = {
    backlog: 'Backlog',
    in_progress: 'In Progress',
    done: 'Done',
    blocked: 'Blocked',
    cancelled: 'Cancelled'
  };
  return map[status];
}

/**
 * Map Notion select to local status
 */
export function mapStatusFromNotion(notionStatus: string): BacklogStatus {
  const map: Record<string, BacklogStatus> = {
    'Backlog': 'backlog',
    'In Progress': 'in_progress',
    'Done': 'done',
    'Blocked': 'blocked',
    'Cancelled': 'cancelled'
  };
  return map[notionStatus] || 'backlog';
}
