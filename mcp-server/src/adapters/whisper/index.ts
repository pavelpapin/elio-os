/**
 * Whisper Adapter
 * Speech-to-text via Groq Whisper API
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import * as groq from '@elio/clients/groq';
import { withRateLimit } from '../../utils/rate-limiter.js';
import { withCircuitBreaker } from '../../utils/circuit-breaker.js';

const youtubeTranscribeSchema = z.object({
  url: z.string().describe('YouTube video URL or video ID'),
  model: z.enum(['whisper-large-v3', 'whisper-large-v3-turbo', 'distil-whisper-large-v3-en'])
    .optional()
    .describe('Whisper model (default: whisper-large-v3-turbo)'),
  language: z.string().optional()
    .describe('Language code (e.g., "ru", "en"). Auto-detect if not specified.'),
  prompt: z.string().optional()
    .describe('Optional prompt to guide transcription style/vocabulary')
});

const audioTranscribeSchema = z.object({
  file_path: z.string().describe('Path to local audio file'),
  model: z.enum(['whisper-large-v3', 'whisper-large-v3-turbo', 'distil-whisper-large-v3-en'])
    .optional()
    .describe('Whisper model (default: whisper-large-v3-turbo)'),
  language: z.string().optional()
    .describe('Language code (e.g., "ru", "en")'),
  prompt: z.string().optional()
    .describe('Optional prompt to guide transcription')
});

const urlTranscribeSchema = z.object({
  audio_url: z.string().url().describe('Direct URL to audio file'),
  model: z.enum(['whisper-large-v3', 'whisper-large-v3-turbo', 'distil-whisper-large-v3-en'])
    .optional()
    .describe('Whisper model (default: whisper-large-v3-turbo)'),
  language: z.string().optional()
    .describe('Language code'),
  prompt: z.string().optional()
    .describe('Optional prompt')
});

const tools: AdapterTool[] = [
  {
    name: 'youtube_transcribe',
    description: `Transcribe YouTube video using Groq Whisper. Downloads audio and converts speech to text.
Best for Russian/multilingual content without subtitles.
Models:
- whisper-large-v3: Best quality, multilingual
- whisper-large-v3-turbo: Fast, good quality (default)
- distil-whisper-large-v3-en: Fastest, English only
Note: Videos longer than ~20 min may exceed 25MB limit.`,
    type: 'read',
    schema: youtubeTranscribeSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof youtubeTranscribeSchema>;

      const result = await withCircuitBreaker('groq', () =>
        withRateLimit('groq', () =>
          groq.transcribeYouTube(p.url, {
            model: p.model,
            language: p.language,
            prompt: p.prompt
          })
        )
      );

      if (!result.success) {
        return JSON.stringify({ error: result.error });
      }

      return JSON.stringify({
        success: true,
        transcript: result.text,
        language: result.language,
        model: p.model || 'whisper-large-v3-turbo'
      }, null, 2);
    }
  },
  {
    name: 'audio_transcribe',
    description: 'Transcribe local audio file using Groq Whisper. Supports mp3, mp4, m4a, wav, webm, flac, ogg.',
    type: 'read',
    schema: audioTranscribeSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof audioTranscribeSchema>;

      const result = await withCircuitBreaker('groq', () =>
        withRateLimit('groq', () =>
          groq.transcribeAudio(p.file_path, {
            model: p.model,
            language: p.language,
            prompt: p.prompt
          })
        )
      );

      if (!result.success) {
        return JSON.stringify({ error: result.error });
      }

      return JSON.stringify({
        success: true,
        transcript: result.text,
        language: result.language
      }, null, 2);
    }
  },
  {
    name: 'url_transcribe',
    description: 'Transcribe audio from direct URL using Groq Whisper.',
    type: 'read',
    schema: urlTranscribeSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof urlTranscribeSchema>;

      const result = await withCircuitBreaker('groq', () =>
        withRateLimit('groq', () =>
          groq.transcribeFromUrl(p.audio_url, {
            model: p.model,
            language: p.language,
            prompt: p.prompt
          })
        )
      );

      if (!result.success) {
        return JSON.stringify({ error: result.error });
      }

      return JSON.stringify({
        success: true,
        transcript: result.text,
        language: result.language
      }, null, 2);
    }
  }
];

export const whisperAdapter: Adapter = {
  name: 'whisper',
  isAuthenticated: groq.isAuthenticated,
  tools
};
