/**
 * YouTube Adapter - Zod Schemas
 */

import { z } from 'zod';

export const transcriptSchema = z.object({
  url: z.string().describe('YouTube video URL or video ID'),
  language: z.string().optional().describe('Preferred language (en, ru, etc). Default: auto-detect')
});

export const channelInfoSchema = z.object({
  channel: z.string().describe('Channel URL, @handle, or channel ID (e.g., @lexfridman, UCXuqSBlHAE6Xw-yeJA0Tunw)')
});

export const channelVideosSchema = z.object({
  channel: z.string().describe('Channel URL, @handle, or channel ID'),
  max_results: z.number().optional().default(50).describe('Max videos to fetch (default 50, max 500)'),
  days_ago: z.number().optional().describe('Only videos from last N days (e.g., 180 for 6 months)'),
  published_after: z.string().optional().describe('ISO date string (e.g., 2025-07-01T00:00:00Z)')
});

export const searchSchema = z.object({
  query: z.string().describe('Search query'),
  max_results: z.number().optional().default(10).describe('Max results (default 10, max 50)'),
  channel_id: z.string().optional().describe('Limit search to specific channel'),
  days_ago: z.number().optional().describe('Only videos from last N days'),
  order: z.enum(['date', 'rating', 'relevance', 'viewCount']).optional().default('relevance')
});

export const videoDetailsSchema = z.object({
  video_id: z.string().describe('YouTube video ID')
});

export const batchTranscriptsSchema = z.object({
  video_ids: z.array(z.string()).describe('Array of video IDs to get transcripts for'),
  language: z.string().optional().describe('Preferred language')
});
