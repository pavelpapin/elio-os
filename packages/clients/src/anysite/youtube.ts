/**
 * YouTube Functions (via AnySite)
 */

import { callTool } from './client.js';
import type { YouTubeVideo, YouTubeSubtitles, YouTubeComment } from './types.js';

export interface SearchVideosOptions {
  count?: number;
  timeout?: number;
}

export async function searchVideos(
  query: string,
  options: SearchVideosOptions = {}
): Promise<YouTubeVideo[]> {
  const result = await callTool<{ videos: YouTubeVideo[] }>('search_youtube_videos', {
    query,
    count: options.count || 10,
    request_timeout: options.timeout || 300
  });
  return result.videos || [];
}

export async function getVideo(
  videoIdOrUrl: string,
  timeout?: number
): Promise<YouTubeVideo | null> {
  try {
    return await callTool<YouTubeVideo>('get_youtube_video', {
      video: videoIdOrUrl,
      request_timeout: timeout || 300
    });
  } catch {
    return null;
  }
}

export async function getVideoSubtitles(
  videoIdOrUrl: string,
  lang: string = 'en',
  timeout?: number
): Promise<YouTubeSubtitles | null> {
  try {
    return await callTool<YouTubeSubtitles>('get_youtube_video_subtitles', {
      video: videoIdOrUrl,
      lang,
      request_timeout: timeout || 300
    });
  } catch {
    return null;
  }
}

export interface GetChannelVideosOptions {
  count?: number;
  timeout?: number;
}

export async function getChannelVideos(
  channelIdOrUrl: string,
  options: GetChannelVideosOptions = {}
): Promise<YouTubeVideo[]> {
  const result = await callTool<{ videos: YouTubeVideo[] }>('get_youtube_channel_videos', {
    channel: channelIdOrUrl,
    count: options.count || 20,
    request_timeout: options.timeout || 300
  });
  return result.videos || [];
}

export interface GetVideoCommentsOptions {
  count?: number;
  timeout?: number;
}

export async function getVideoComments(
  videoIdOrUrl: string,
  options: GetVideoCommentsOptions = {}
): Promise<YouTubeComment[]> {
  const result = await callTool<{ comments: YouTubeComment[] }>('get_youtube_video_comments', {
    video: videoIdOrUrl,
    count: options.count || 50,
    request_timeout: options.timeout || 300
  });
  return result.comments || [];
}
