/**
 * YouTube Connector
 * YouTube Data API v3 + Supadata transcripts + yt-dlp/Whisper fallback
 */

// Re-export types
export * from './types.js';

// Re-export credentials utilities
export {
  isYouTubeApiAuthenticated,
  isSupadataAuthenticated,
  isAuthenticated
} from './credentials.js';

// Re-export transcript functions
export { getYoutubeTranscript, extractVideoId } from './transcript.js';

// Re-export API functions
export {
  extractChannelId,
  getChannelInfo,
  getChannelVideos,
  searchVideos,
  getVideoDetails
} from './api.js';
