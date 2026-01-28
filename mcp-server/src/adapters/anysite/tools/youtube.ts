/**
 * YouTube Tools
 */

import { z } from 'zod';
import { AdapterTool } from '../../../gateway/types.js';
import * as anysite from '@elio/clients/anysite';
import { safeCall } from '../utils.js';

const ytSearchSchema = z.object({
  query: z.string().describe('Search query'),
  count: z.number().optional().describe('Max results (default: 10, max: 600)')
});

const ytVideoSchema = z.object({
  video: z.string().describe('Video ID or URL')
});

const ytSubtitlesSchema = z.object({
  video: z.string().describe('Video ID or URL'),
  lang: z.string().optional().describe('Language code (default: en)')
});

const ytChannelSchema = z.object({
  channel: z.string().describe('Channel URL, alias, @username, or ID'),
  count: z.number().optional().describe('Max videos to return')
});

export const youtubeTools: AdapterTool[] = [
  {
    name: 'youtube_search',
    description: 'Search YouTube videos',
    type: 'read',
    schema: ytSearchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof ytSearchSchema>;
      return safeCall(() => anysite.youtube.searchVideos(p.query, { count: p.count }));
    }
  },
  {
    name: 'youtube_video',
    description: 'Get YouTube video metadata',
    type: 'read',
    schema: ytVideoSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof ytVideoSchema>;
      return safeCall(() => anysite.youtube.getVideo(p.video));
    }
  },
  {
    name: 'youtube_subtitles',
    description: 'Get YouTube video subtitles/transcript',
    type: 'read',
    schema: ytSubtitlesSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof ytSubtitlesSchema>;
      return safeCall(() => anysite.youtube.getVideoSubtitles(p.video, p.lang));
    }
  },
  {
    name: 'youtube_channel',
    description: 'Get videos from YouTube channel',
    type: 'read',
    schema: ytChannelSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof ytChannelSchema>;
      return safeCall(() => anysite.youtube.getChannelVideos(p.channel, { count: p.count }));
    }
  }
];
