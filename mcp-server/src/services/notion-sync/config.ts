/**
 * Notion Sync - Configuration
 */

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
