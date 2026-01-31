/**
 * YouTube Channel Functions
 */

import type { ChannelInfo, VideoItem, YouTubeCredentials } from './types.js';
import { loadCredentialsSync, YT_API_BASE } from './credentials.js';

/**
 * Extract channel ID from various URL formats
 */
export function extractChannelId(input: string): string | null {
  if (/^UC[\w-]{22}$/.test(input)) return input;

  const patterns = [
    /youtube\.com\/channel\/(UC[\w-]{22})/,
    /youtube\.com\/@([\w-]+)/,
    /youtube\.com\/c\/([\w-]+)/,
    /youtube\.com\/user\/([\w-]+)/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function resolveChannelId(handleOrId: string): Promise<string | null> {
  const credentials = loadCredentialsSync<YouTubeCredentials>('youtube.json');
  if (!credentials) return null;

  if (/^UC[\w-]{22}$/.test(handleOrId)) return handleOrId;

  try {
    const url = new URL(`${YT_API_BASE}/channels`);
    url.searchParams.set('part', 'id');
    url.searchParams.set('forHandle', handleOrId.replace('@', ''));
    url.searchParams.set('key', credentials.api_key);

    const response = await fetch(url.toString());
    const data = (await response.json()) as { items?: Array<{ id: string }> };

    if (data.items && data.items.length > 0) {
      return data.items[0].id;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get channel information
 */
export async function getChannelInfo(channelInput: string): Promise<{
  success: boolean;
  channel?: ChannelInfo;
  error?: string;
}> {
  const credentials = loadCredentialsSync<YouTubeCredentials>('youtube.json');
  if (!credentials) {
    return { success: false, error: 'YouTube API not configured' };
  }

  const channelId = await resolveChannelId(extractChannelId(channelInput) || channelInput);
  if (!channelId) {
    return { success: false, error: `Could not resolve channel: ${channelInput}` };
  }

  try {
    const url = new URL(`${YT_API_BASE}/channels`);
    url.searchParams.set('part', 'snippet,contentDetails,statistics');
    url.searchParams.set('id', channelId);
    url.searchParams.set('key', credentials.api_key);

    const response = await fetch(url.toString());
    const data = (await response.json()) as {
      items?: Array<{
        id: string;
        snippet: { title: string; description: string };
        contentDetails: { relatedPlaylists: { uploads: string } };
        statistics: { subscriberCount?: string; videoCount?: string; viewCount?: string };
      }>;
      error?: { message?: string };
    };

    if (!response.ok || !data.items?.length) {
      return { success: false, error: data.error?.message || 'Channel not found' };
    }

    const ch = data.items[0];
    return {
      success: true,
      channel: {
        id: ch.id,
        title: ch.snippet.title,
        description: ch.snippet.description,
        subscriberCount: parseInt(ch.statistics.subscriberCount || '0'),
        videoCount: parseInt(ch.statistics.videoCount || '0'),
        viewCount: parseInt(ch.statistics.viewCount || '0'),
        uploadsPlaylistId: ch.contentDetails.relatedPlaylists.uploads,
      },
    };
  } catch (error) {
    return { success: false, error: `Request failed: ${error}` };
  }
}

/**
 * Get videos from a channel
 */
export async function getChannelVideos(
  channelInput: string,
  options?: { maxResults?: number; publishedAfter?: string }
): Promise<{
  success: boolean;
  channel?: ChannelInfo;
  videos?: VideoItem[];
  error?: string;
}> {
  const credentials = loadCredentialsSync<YouTubeCredentials>('youtube.json');
  if (!credentials) {
    return { success: false, error: 'YouTube API not configured' };
  }

  const channelResult = await getChannelInfo(channelInput);
  if (!channelResult.success || !channelResult.channel) {
    return { success: false, error: channelResult.error };
  }

  const playlistId = channelResult.channel.uploadsPlaylistId;
  const maxResults = options?.maxResults || 50;
  const videos: VideoItem[] = [];
  let nextPageToken: string | undefined;

  try {
    while (videos.length < maxResults) {
      const url = new URL(`${YT_API_BASE}/playlistItems`);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('playlistId', playlistId);
      url.searchParams.set('maxResults', '50');
      url.searchParams.set('key', credentials.api_key);
      if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);

      const response = await fetch(url.toString());
      const data = (await response.json()) as {
        nextPageToken?: string;
        items?: Array<{
          snippet: {
            publishedAt: string;
            title: string;
            description: string;
            channelTitle: string;
            resourceId: { videoId: string };
            thumbnails?: { high?: { url: string } };
          };
        }>;
      };

      for (const item of data.items || []) {
        if (options?.publishedAfter && item.snippet.publishedAt < options.publishedAfter) {
          continue;
        }
        videos.push({
          videoId: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          publishedAt: item.snippet.publishedAt,
          thumbnailUrl: item.snippet.thumbnails?.high?.url || '',
          channelTitle: item.snippet.channelTitle,
        });
        if (videos.length >= maxResults) break;
      }

      nextPageToken = data.nextPageToken;
      if (!nextPageToken) break;
    }

    return { success: true, channel: channelResult.channel, videos };
  } catch (error) {
    return { success: false, error: `Request failed: ${error}` };
  }
}
