/**
 * Gmail Integration
 * Send and receive emails via Gmail API
 */

// Types
export type { GoogleToken, EmailMessage, GoogleCredentials } from './types.js';

// Credentials
export { loadCredentials, saveToken } from './credentials.js';

// API
export { listEmails, getEmail, sendEmail, isAuthenticated, getAuthInstructions } from './api.js';
