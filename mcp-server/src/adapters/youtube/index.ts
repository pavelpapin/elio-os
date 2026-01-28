/**
 * YouTube Adapter
 * MCP tools for YouTube Data API + Supadata transcripts
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import {
  getYoutubeTranscript,
  getChannelInfo,
  getChannelVideos,
  searchVideos,
  getVideoDetails,
  isYouTubeApiAuthenticated,
  isSupadataAuthenticated
} from '@elio/clients/youtube';
import {
  transcriptSchema,
  channelInfoSchema,
  channelVideosSchema,
  searchSchema,
  videoDetailsSchema,
  batchTranscriptsSchema,
} from './schemas.js';

function isAuthenticated(): boolean {
  return isYouTubeApiAuthenticated() || isSupadataAuthenticated();
}

const tools: AdapterTool[] = [
  {
    name: 'transcript',
    description: 'Get transcript/subtitles from a YouTube video. Uses Supadata API.',
    type: 'read',
    schema: transcriptSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof transcriptSchema>;
      const result = await getYoutubeTranscript(p.url, { language: p.language });
      if (!result.success) return JSON.stringify({ error: result.error });
      return JSON.stringify({ videoId: result.videoId, language: result.language, availableLanguages: result.availableLanguages, transcript: result.transcript, charCount: result.transcript?.length || 0 }, null, 2);
    }
  },
  {
    name: 'channel_info',
    description: 'Get YouTube channel information (subscriber count, video count, etc).',
    type: 'read',
    schema: channelInfoSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof channelInfoSchema>;
      return JSON.stringify(await getChannelInfo(p.channel), null, 2);
    }
  },
  {
    name: 'channel_videos',
    description: 'Get list of videos from a YouTube channel. Can filter by date.',
    type: 'read',
    schema: channelVideosSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof channelVideosSchema>;
      let publishedAfter = p.published_after;
      if (!publishedAfter && p.days_ago) {
        const date = new Date();
        date.setDate(date.getDate() - p.days_ago);
        publishedAfter = date.toISOString();
      }
      const result = await getChannelVideos(p.channel, { maxResults: Math.min(p.max_results || 50, 500), publishedAfter });
      if (!result.success) return JSON.stringify({ error: result.error });
      return JSON.stringify({
        channel: result.channel, videosCount: result.videos?.length || 0,
        videos: result.videos?.map(v => ({ id: v.videoId, title: v.title, date: v.publishedAt.split('T')[0], url: `https://youtube.com/watch?v=${v.videoId}` }))
      }, null, 2);
    }
  },
  {
    name: 'search',
    description: 'Search YouTube videos. Higher quota cost (100 units).',
    type: 'read',
    schema: searchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof searchSchema>;
      let publishedAfter: string | undefined;
      if (p.days_ago) { const date = new Date(); date.setDate(date.getDate() - p.days_ago); publishedAfter = date.toISOString(); }
      const result = await searchVideos(p.query, { maxResults: Math.min(p.max_results || 10, 50), channelId: p.channel_id, publishedAfter, order: p.order });
      if (!result.success) return JSON.stringify({ error: result.error });
      return JSON.stringify({
        totalResults: result.totalResults,
        videos: result.videos?.map(v => ({ id: v.videoId, title: v.title, channel: v.channelTitle, date: v.publishedAt.split('T')[0], url: `https://youtube.com/watch?v=${v.videoId}` }))
      }, null, 2);
    }
  },
  {
    name: 'video_details',
    description: 'Get detailed info about a video (duration, views, likes, tags).',
    type: 'read',
    schema: videoDetailsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof videoDetailsSchema>;
      return JSON.stringify(await getVideoDetails(p.video_id), null, 2);
    }
  },
  {
    name: 'batch_transcripts',
    description: 'Get transcripts for multiple videos at once.',
    type: 'read',
    schema: batchTranscriptsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof batchTranscriptsSchema>;
      const results = await Promise.all(
        p.video_ids.slice(0, 10).map(async (videoId) => {
          const result = await getYoutubeTranscript(`https://youtube.com/watch?v=${videoId}`, { language: p.language });
          return { videoId, success: result.success, language: result.language, charCount: result.transcript?.length || 0, transcript: result.success ? result.transcript : undefined, error: result.error };
        })
      );
      const successful = results.filter(r => r.success).length;
      return JSON.stringify({ total: p.video_ids.length, processed: results.length, successful, failed: results.length - successful, results }, null, 2);
    }
  }
];

export const youtubeAdapter: Adapter = { name: 'youtube', isAuthenticated, tools };
export default youtubeAdapter;
