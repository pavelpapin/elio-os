/**
 * Notion Sync - Property Mappers
 */

import type { BacklogPriority, BacklogStatus } from '@elio/db';

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

/**
 * Map source to Notion select name
 */
export function mapSourceToNotion(source: string): string {
  const sourceMap: Record<string, string> = {
    cto_review: 'CTO Review',
    cpo_review: 'CPO Review',
    user_feedback: 'User Feedback',
    manual: 'Manual',
    bug_report: 'Bug Report',
    correction_log: 'Correction Log'
  };
  return sourceMap[source] || 'Manual';
}
