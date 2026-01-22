/**
 * Verification Types
 * Type definitions for deliverable verification
 */

export type DeliverableType =
  | 'notion_page'
  | 'notion_database_entry'
  | 'file'
  | 'email_sent'
  | 'calendar_event';

export interface VerifyConfig {
  type: DeliverableType;

  // For Notion
  pageId?: string;
  databaseId?: string;
  expectedProperties?: Record<string, unknown>;
  minBlocks?: number;
  requiredHeadings?: string[];

  // For files
  filePath?: string;
  minSize?: number;
  containsText?: string[];

  // For email
  messageId?: string;
  recipientEmail?: string;

  // For calendar
  eventId?: string;
  calendarId?: string;

  // General
  maxRetries?: number;
  retryDelay?: number; // ms
}

export interface VerifyResult {
  ok: boolean;
  error?: string;
  details?: Record<string, unknown>;
  url?: string;
  path?: string;
}

export interface Verifier {
  (config: VerifyConfig): Promise<VerifyResult>;
}
