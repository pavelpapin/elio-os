/**
 * YouTube Search Functions
 */

import type { VideoItem, YouTubeCredentials } from './types.js';
import { loadCredentialsSync, YT_API_BASE } from './credentials.js';

/**
 * Search YouTube videos
 */
export async function searchVideos(
  query: string,
  options?: {
    maxResults?: number;
    channelId?: string;
    publishedAfter?: string;
    publishedBefore?: string;
    order?: 'date' | 'rating' | 'relevance' | 'viewCount';
  }
): Promise<{
  success: boolean;
  videos?: VideoItem[];
  totalResults?: number;
  error?: string;
}> {
  const credentials = loadCredentialsSync<YouTubeCredentials>('youtube.json');
  if (!credentials) {
    return { success: false, error: 'YouTube API not configured' };
  }

  try {
    const url = new URL(`${YT_API_BASE}/search`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', String(options?.maxResults || 25));
    url.searchParams.set('order', options?.order || 'relevance');
    url.searchParams.set('key', credentials.api_key);

    if (options?.channelId) {
      url.searchParams.set('channelId', options.channelId);
    }
    if (options?.publishedAfter) {
      url.searchParams.set('publishedAfter', options.publishedAfter);
    }
    if (options?.publishedBefore) {
      url.searchParams.set('publishedBefore', options.publishedBefore);
    }

    const response = await fetch(url.toString());
    const data = (await response.json()) as {
      pageInfo?: { totalResults: number };
      items?: Array<{
        id: { videoId: string };
        snippet: {
          publishedAt: string;
          title: string;
          description: string;
          channelTitle: string;
          thumbnails?: { high?: { url: string } };
        };
      }>;
    };

    const videos = (data.items || []).map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl: item.snippet.thumbnails?.high?.url || '',
      channelTitle: item.snippet.channelTitle,
    }));

    return {
      success: true,
      videos,
      totalResults: data.pageInfo?.totalResults || videos.length,
    };
  } catch (error) {
    return { success: false, error: `Request failed: ${error}` };
  }
}
