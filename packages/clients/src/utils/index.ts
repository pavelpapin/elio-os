/**
 * Shared Utilities for API Clients
 */

// Cache
export { ConnectorCache, cacheKey } from './cache.js';

// Credentials (all exports)
export {
  loadCredentials,
  loadCredentialsSync,
  hasCredentials,
  credentialsExist,
  getApiKey,
  getGoogleToken,
  isGoogleAuthenticated,
  getTelegramCredentials,
  getSlackCredentials,
  getNotionCredentials,
  getPerplexityCredentials,
  getLinkedInCredentials,
  getN8nCredentials,
} from './credentials.js';

// Types
export type {
  GoogleToken,
  TelegramCredentials,
  SlackCredentials,
  NotionCredentials,
  PerplexityCredentials,
  LinkedInCredentials,
  N8nCredentials,
} from './credentials.js';

// HTTP utilities
export {
  httpRequest,
  googleApiRequest,
  buildQueryString,
  HttpError,
} from './http.js';

export type { HttpRequestOptions } from './http.js';

// File logging
export {
  fileLogger,
  createFileLogger,
  setMinLevel,
  LOG_PATHS,
} from './file-logger.js';

export type { LogLevel, LogEntry } from './file-logger.js';
