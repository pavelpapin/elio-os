/**
 * YouTube Transcript Extraction
 * Supadata API + yt-dlp fallback + Whisper fallback
 */

import type { TranscriptResult, SupadataCredentials } from './types.js';
import { loadCredentialsSync, SUPADATA_API, logger } from './credentials.js';
import { extractSubtitlesViaYtdlp, transcribeViaWhisper } from './transcript-fallbacks.js';

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Get YouTube video transcript with 3-tier fallback
 */
export async function getYoutubeTranscript(
  url: string,
  options?: { language?: string; useWhisperFallback?: boolean }
): Promise<TranscriptResult> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    return { success: false, error: `Invalid YouTube URL: ${url}` };
  }

  const language = options?.language || 'en';
  const useWhisperFallback = options?.useWhisperFallback ?? true;

  // 1. Try Supadata first
  const supadata = loadCredentialsSync<SupadataCredentials>('supadata.json');
  if (supadata) {
    try {
      const apiUrl = new URL(`${SUPADATA_API}/youtube/transcript`);
      apiUrl.searchParams.set('url', url);
      apiUrl.searchParams.set('text', 'true');
      apiUrl.searchParams.set('lang', language);

      logger.info(`[1/3] Trying Supadata for ${videoId}`);

      const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: { 'x-api-key': supadata.api_key }
      });

      if (response.ok) {
        const data = await response.json() as {
          lang: string;
          availableLangs: string[];
          content: string | Array<{ text: string }>;
        };

        const transcript = typeof data.content === 'string'
          ? data.content
          : data.content.map(s => s.text).join(' ');

        if (transcript && transcript.trim().length > 0) {
          logger.info(`Supadata success: ${transcript.length} chars`);
          return {
            success: true,
            videoId,
            language: data.lang,
            availableLanguages: data.availableLangs,
            transcript,
            source: 'supadata'
          };
        }
      }
      logger.info(`Supadata: no transcript for ${videoId}`);
    } catch (error) {
      logger.error(`Supadata failed for ${videoId}`, { error: String(error) });
    }
  }

  // 2. Try yt-dlp
  const languages = language === 'ru' ? ['ru', 'en'] : [language, 'en', 'ru'];
  logger.info(`[2/3] Trying yt-dlp subtitles for ${videoId}...`);
  const ytdlpResult = await extractSubtitlesViaYtdlp(videoId, languages);

  if (ytdlpResult) {
    return {
      success: true,
      videoId,
      language: ytdlpResult.language,
      availableLanguages: [],
      transcript: ytdlpResult.text,
      source: 'yt-dlp'
    };
  }

  // 3. Fallback to Whisper
  if (useWhisperFallback) {
    logger.info(`[3/3] Trying Groq Whisper for ${videoId}...`);
    const whisperTranscript = await transcribeViaWhisper(videoId);

    if (whisperTranscript) {
      return {
        success: true,
        videoId,
        language: 'auto',
        availableLanguages: [],
        transcript: whisperTranscript,
        source: 'whisper'
      };
    }
  }

  return { success: false, videoId, error: 'No transcript available from any source' };
}
