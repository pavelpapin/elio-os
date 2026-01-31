/**
 * Groq Type Definitions
 */

export interface GroqCredentials {
  api_key: string;
}

export interface TranscriptResult {
  success: boolean;
  text?: string;
  language?: string;
  duration?: number;
  error?: string;
}

export interface WhisperResponse {
  text: string;
  x_groq?: {
    id: string;
  };
}

export interface TranscribeOptions {
  model?: WhisperModel;
  language?: string;
  prompt?: string;
}

export interface YouTubeTranscribeOptions extends TranscribeOptions {
  keepAudio?: boolean;
}

export const WHISPER_MODELS = {
  'whisper-large-v3': 'Best quality, multilingual',
  'whisper-large-v3-turbo': 'Fast, good quality, multilingual',
  'distil-whisper-large-v3-en': 'Fastest, English only',
} as const;

export type WhisperModel = keyof typeof WHISPER_MODELS;
