/**
 * Groq Whisper Transcription Functions
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadCredentialsSync } from '../utils/credentials.js';
import { fileLogger } from '../utils/file-logger.js';
import { downloadYouTubeAudio, extractVideoId } from './youtube.js';
import type {
  GroqCredentials,
  TranscriptResult,
  WhisperResponse,
  TranscribeOptions,
  YouTubeTranscribeOptions,
  WhisperModel,
} from './types.js';

const CREDENTIALS_FILE = 'groq.json';
const API_BASE = 'https://api.groq.com/openai/v1';

function loadCredentials(): GroqCredentials | null {
  return loadCredentialsSync<GroqCredentials>(CREDENTIALS_FILE);
}

export function isAuthenticated(): boolean {
  return loadCredentials() !== null;
}

/**
 * Transcribe audio file using Groq Whisper API
 */
export async function transcribeAudio(
  filePath: string,
  options?: TranscribeOptions
): Promise<TranscriptResult> {
  const credentials = loadCredentials();
  if (!credentials) {
    return { success: false, error: 'Groq not configured. Add api_key to groq.json' };
  }

  if (!fs.existsSync(filePath)) {
    return { success: false, error: `File not found: ${filePath}` };
  }

  const model: WhisperModel = options?.model || 'whisper-large-v3-turbo';

  try {
    fileLogger.info('groq', `Transcribing with ${model}`, { filePath });

    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });
    formData.append('file', blob, path.basename(filePath));
    formData.append('model', model);
    formData.append('response_format', 'json');

    if (options?.language) formData.append('language', options.language);
    if (options?.prompt) formData.append('prompt', options.prompt);

    const response = await fetch(`${API_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${credentials.api_key}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      fileLogger.error('groq', `API error: ${response.status}`, { error: errorText });
      return { success: false, error: `Groq API error: ${response.status} - ${errorText}` };
    }

    const data = (await response.json()) as WhisperResponse;
    fileLogger.info('groq', 'Transcription complete', { textLength: data.text?.length, model });

    return { success: true, text: data.text, language: options?.language };
  } catch (error) {
    fileLogger.error('groq', 'Transcription failed', { error: String(error) });
    return { success: false, error: `Transcription failed: ${error}` };
  }
}

/**
 * Transcribe YouTube video using Groq Whisper
 */
export async function transcribeYouTube(
  url: string,
  options?: YouTubeTranscribeOptions
): Promise<TranscriptResult> {
  const credentials = loadCredentials();
  if (!credentials) {
    return { success: false, error: 'Groq not configured' };
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return { success: false, error: `Invalid YouTube URL: ${url}` };
  }

  fileLogger.info('groq', `Starting YouTube transcription for ${videoId}`);

  const downloadResult = await downloadYouTubeAudio(url);
  if (!downloadResult.success || !downloadResult.filePath) {
    return { success: false, error: downloadResult.error };
  }

  try {
    const result = await transcribeAudio(downloadResult.filePath, {
      model: options?.model,
      language: options?.language,
      prompt: options?.prompt,
    });
    return result;
  } finally {
    if (!options?.keepAudio && downloadResult.filePath && fs.existsSync(downloadResult.filePath)) {
      fs.unlinkSync(downloadResult.filePath);
      fileLogger.info('groq', 'Cleaned up temp audio file');
    }
  }
}

/**
 * Transcribe audio from URL
 */
export async function transcribeFromUrl(
  audioUrl: string,
  options?: TranscribeOptions
): Promise<TranscriptResult> {
  const credentials = loadCredentials();
  if (!credentials) {
    return { success: false, error: 'Groq not configured' };
  }

  const model: WhisperModel = options?.model || 'whisper-large-v3-turbo';

  try {
    fileLogger.info('groq', `Transcribing from URL with ${model}`);

    const response = await fetch(audioUrl);
    if (!response.ok) {
      return { success: false, error: `Failed to fetch audio: ${response.status}` };
    }

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });

    const formData = new FormData();
    formData.append('file', blob, 'audio.mp3');
    formData.append('model', model);
    formData.append('response_format', 'json');

    if (options?.language) formData.append('language', options.language);

    const transcribeResponse = await fetch(`${API_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${credentials.api_key}` },
      body: formData,
    });

    if (!transcribeResponse.ok) {
      const errorText = await transcribeResponse.text();
      return { success: false, error: `Groq API error: ${transcribeResponse.status} - ${errorText}` };
    }

    const data = (await transcribeResponse.json()) as WhisperResponse;
    return { success: true, text: data.text, language: options?.language };
  } catch (error) {
    fileLogger.error('groq', 'URL transcription failed', { error: String(error) });
    return { success: false, error: `Transcription failed: ${error}` };
  }
}
