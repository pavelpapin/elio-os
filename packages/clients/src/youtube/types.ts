/**
 * YouTube Connector Types
 */

export interface ChannelInfo {
  id: string;
  title: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  uploadsPlaylistId: string;
}

export interface VideoItem {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  channelTitle: string;
}

export interface VideoDetails {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  tags: string[];
}

export interface TranscriptResult {
  success: boolean;
  videoId?: string;
  language?: string;
  availableLanguages?: string[];
  transcript?: string;
  source?: 'supadata' | 'yt-dlp' | 'whisper';
  error?: string;
}

export interface YouTubeCredentials {
  api_key: string;
}

export interface SupadataCredentials {
  api_key: string;
}

export interface GroqCredentials {
  api_key: string;
}
