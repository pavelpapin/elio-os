/**
 * YouTube Connector Credentials
 */

import * as fs from 'fs';
import { paths, createLogger } from '@elio/shared';
import { YouTubeCredentials, SupadataCredentials, GroqCredentials } from './types.js';

const logger = createLogger('youtube');
const SECRETS_DIR = paths.secrets;

export const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
export const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
export const SUPADATA_API = 'https://api.supadata.ai/v1';

export function loadCredentialsSync<T>(filename: string): T | null {
  const credPath = `${SECRETS_DIR}/${filename}`;
  if (!fs.existsSync(credPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(credPath, 'utf-8')) as T;
  } catch (error) {
    logger.warn(`Failed to load credentials: ${filename}`, { error });
    return null;
  }
}

export function getYouTubeCredentials(): YouTubeCredentials | null {
  return loadCredentialsSync<YouTubeCredentials>('youtube.json');
}

export function getSupadataCredentials(): SupadataCredentials | null {
  return loadCredentialsSync<SupadataCredentials>('supadata.json');
}

export function getGroqCredentials(): GroqCredentials | null {
  return loadCredentialsSync<GroqCredentials>('groq.json');
}

export function isYouTubeApiAuthenticated(): boolean {
  return getYouTubeCredentials() !== null;
}

export function isSupadataAuthenticated(): boolean {
  return getSupadataCredentials() !== null;
}

export function isAuthenticated(): boolean {
  return isYouTubeApiAuthenticated();
}

export { logger };
