/**
 * AnySite Types
 * Type definitions for all AnySite tool responses
 */

// Web Search
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// Y Combinator
export interface YCCompany {
  slug: string;
  name: string;
  batch?: string;
  status?: 'Active' | 'Acquired' | 'Public' | 'Inactive';
  description?: string;
  url?: string;
  founders?: string[];
  industries?: string[];
}

export interface YCFounder {
  name: string;
  company?: string;
  title?: string;
  batch?: string;
  industries?: string[];
}

// YouTube
export interface YouTubeVideo {
  id: string;
  url: string;
  title: string;
  description?: string;
  views?: number;
  likes?: number;
  comments?: number;
  upload_date?: string;
  channel_id?: string;
  channel_name?: string;
}

export interface YouTubeSubtitles {
  text: string;
  subtitles?: Array<{ start: number; duration: number; text: string }>;
  language: string;
}

export interface YouTubeComment {
  author: string;
  text: string;
  likes?: number;
  replies?: number;
  timestamp?: string;
}

// SEC
export interface SECDocument {
  accession_number: string;
  file_name: string;
  filing_date: string;
  cik: string;
  form_type: string;
  url: string;
}

// Web Parser
export interface ParsedPage {
  url: string;
  title?: string;
  content?: string;
  contacts?: {
    emails?: string[];
    phones?: string[];
    social_links?: string[];
  };
  links?: string[];
}

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

// Social media types re-exported from dedicated file
export {
  LinkedInProfile,
  LinkedInCompany,
  LinkedInPost,
  LinkedInJob,
  InstagramPost,
  InstagramUser,
  TwitterPost,
  TwitterUser,
  RedditPost,
  RedditComment,
} from './social-types.js';
