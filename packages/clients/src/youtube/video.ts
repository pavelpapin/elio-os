/**
 * YouTube Video Details Functions
 */

import type { VideoDetails, YouTubeCredentials } from './types.js';
import { loadCredentialsSync, YT_API_BASE } from './credentials.js';

/**
 * Get video details by ID
 */
export async function getVideoDetails(videoId: string): Promise<{
  success: boolean;
  video?: VideoDetails;
  error?: string;
}> {
  const credentials = loadCredentialsSync<YouTubeCredentials>('youtube.json');
  if (!credentials) {
    return { success: false, error: 'YouTube API not configured' };
  }

  try {
    const url = new URL(`${YT_API_BASE}/videos`);
    url.searchParams.set('part', 'snippet,contentDetails,statistics');
    url.searchParams.set('id', videoId);
    url.searchParams.set('key', credentials.api_key);

    const response = await fetch(url.toString());
    const data = (await response.json()) as {
      items?: Array<{
        id: string;
        snippet: {
          title: string;
          description: string;
          publishedAt: string;
          channelId: string;
          channelTitle: string;
          tags?: string[];
        };
        contentDetails: { duration: string };
        statistics: { viewCount?: string; likeCount?: string };
      }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      return { success: false, error: `API error: ${data.error?.message || response.status}` };
    }

    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'Video not found' };
    }

    const video = data.items[0];
    return {
      success: true,
      video: {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        publishedAt: video.snippet.publishedAt,
        channelId: video.snippet.channelId,
        channelTitle: video.snippet.channelTitle,
        duration: video.contentDetails.duration,
        viewCount: parseInt(video.statistics.viewCount || '0'),
        likeCount: parseInt(video.statistics.likeCount || '0'),
        tags: video.snippet.tags || [],
      },
    };
  } catch (error) {
    return { success: false, error: `Request failed: ${error}` };
  }
}
