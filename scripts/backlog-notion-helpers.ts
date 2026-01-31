/**
 * Backlog to Notion Helper Functions
 * Property builders and mappers for Notion API
 */

// Notion DB IDs
export const NOTION_DBS = {
  technical: '2ef33fbf-b00e-810b-aea3-cafeff3d9462',
  product: '2ef33fbf-b00e-813c-b77a-c9ab4d9450c3'
}

// Types
export interface BacklogItem {
  id: string
  title: string
  description?: string
  backlog_type: 'technical' | 'product'
  category?: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'backlog' | 'in_progress' | 'done' | 'blocked' | 'cancelled'
  effort?: string
  impact?: string
  source: string
  source_quote?: string
  notion_page_id?: string
}

// Mapping constants
export const priorityMap: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
}

export const statusMap: Record<string, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
  cancelled: 'Cancelled'
}

export const sourceMap: Record<string, string> = {
  cto_review: 'CTO Review',
  cpo_review: 'CPO Review',
  ceo_decision: 'CEO Decision',
  user_feedback: 'User Feedback',
  manual: 'Manual',
  bug_report: 'Bug Report',
  correction_log: 'Correction Log'
}

/**
 * Build Notion properties object from backlog item
 */
export function buildNotionProperties(item: BacklogItem): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    'Task': {
      title: [{ text: { content: item.title } }]
    },
    'Priority': {
      select: { name: priorityMap[item.priority] || 'Medium' }
    },
    'Status': {
      select: { name: statusMap[item.status] || 'Backlog' }
    }
  }

  if (item.category) {
    properties['Category'] = { select: { name: item.category } }
  }

  if (item.effort && item.backlog_type === 'technical') {
    properties['Effort'] = { select: { name: item.effort.toUpperCase() } }
  }

  if (item.description) {
    properties['Description'] = {
      rich_text: [{ text: { content: item.description.slice(0, 2000) } }]
    }
  }

  properties['Source'] = {
    select: { name: sourceMap[item.source] || 'Manual' }
  }

  if (item.backlog_type === 'product') {
    if (item.source_quote) {
      properties['User Quote'] = {
        rich_text: [{ text: { content: item.source_quote.slice(0, 2000) } }]
      }
    }
    if (item.impact) {
      properties['Impact'] = {
        select: { name: item.impact.charAt(0).toUpperCase() + item.impact.slice(1) }
      }
    }
  }

  return properties
}
