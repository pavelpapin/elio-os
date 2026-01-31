/**
 * Backlog Sync - Config, Types, Mappings
 */

import * as fs from 'fs';

// Notion API
export const NOTION_API = 'https://api.notion.com/v1';
export const NOTION_VERSION = '2022-06-28';

// Types
export type BacklogType = 'technical' | 'product';
export type BacklogStatus = 'backlog' | 'in_progress' | 'done' | 'blocked' | 'cancelled';
export type BacklogPriority = 'critical' | 'high' | 'medium' | 'low';

export interface BacklogItem {
  id: string;
  title: string;
  description?: string;
  backlog_type: BacklogType;
  category?: string;
  priority: BacklogPriority;
  status: BacklogStatus;
  effort?: string;
  impact?: string;
  source: string;
  source_quote?: string;
  notion_page_id?: string;
  notion_synced_at?: string;
  updated_at?: string;
}

export interface NotionPage {
  id: string;
  url: string;
  last_edited_time: string;
  properties: Record<string, unknown>;
}

export interface SyncResult {
  created: number;
  updated: number;
  errors: number;
}

// Notion DB IDs
export const NOTION_DBS: Record<BacklogType, string> = {
  technical: '2ef33fbf-b00e-810b-aea3-cafeff3d9462',
  product: '2ef33fbf-b00e-813c-b77a-c9ab4d9450c3'
};

// Mappings
export const statusToNotion: Record<BacklogStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
  cancelled: 'Cancelled'
};

export const statusFromNotion: Record<string, BacklogStatus> = {
  'Backlog': 'backlog',
  'In Progress': 'in_progress',
  'Done': 'done',
  'Blocked': 'blocked',
  'Cancelled': 'cancelled'
};

export const priorityToNotion: Record<BacklogPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

export const sourceToNotion: Record<string, string> = {
  cto_review: 'CTO Review',
  cpo_review: 'CPO Review',
  user_feedback: 'User Feedback',
  manual: 'Manual',
  bug_report: 'Bug Report',
  correction_log: 'Correction Log'
};

// Credentials
export function getSupabaseConfig(): { url: string; key: string } {
  const path = '/root/.claude/secrets/supabase.json';
  const creds = JSON.parse(fs.readFileSync(path, 'utf-8'));
  return { url: creds.url, key: creds.service_role_key };
}

export function getNotionKey(): string {
  const path = '/root/.claude/secrets/notion.json';
  const creds = JSON.parse(fs.readFileSync(path, 'utf-8'));
  return creds.api_key;
}

// Rate limit helper
export const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
