/**
 * Groq Integration
 * Whisper speech-to-text via Groq API
 */

// Types
export type {
  TranscriptResult,
  TranscribeOptions,
  YouTubeTranscribeOptions,
  WhisperModel,
} from './types.js';

export { WHISPER_MODELS } from './types.js';

// Transcription functions
export {
  transcribeAudio,
  transcribeYouTube,
  transcribeFromUrl,
  isAuthenticated,
} from './transcribe.js';
