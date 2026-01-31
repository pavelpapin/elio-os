/**
 * Backlog Types
 * Type definitions for CTO/CPO backlog items
 */

export type BacklogType = 'technical' | 'product';
export type BacklogPriority = 'critical' | 'high' | 'medium' | 'low';
export type BacklogStatus = 'backlog' | 'in_progress' | 'done' | 'blocked' | 'cancelled';
export type BacklogEffort = 'xs' | 's' | 'm' | 'l' | 'xl';
export type BacklogImpact = 'high' | 'medium' | 'low';
export type BacklogSource = 'cto_review' | 'cpo_review' | 'user_feedback' | 'manual' | 'bug_report' | 'correction_log';

export interface BacklogItem {
  id: string;
  title: string;
  description?: string;
  backlog_type: BacklogType;
  category?: string;
  priority: BacklogPriority;
  status: BacklogStatus;
  effort?: BacklogEffort;
  impact?: BacklogImpact;
  source: BacklogSource;
  source_quote?: string;
  notion_page_id?: string;
  notion_db_id?: string;
  notion_synced_at?: string;
  notion_url?: string;
  tags: string[];
  assignee?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface BacklogStats {
  backlog_type: BacklogType;
  total: number;
  backlog: number;
  in_progress: number;
  done: number;
  blocked: number;
  high_priority: number;
}
