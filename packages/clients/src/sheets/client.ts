/**
 * Google Sheets API Client
 */

import { httpRequest, HttpError } from '../utils/http.js';
import { getGoogleToken } from '../utils/credentials.js';

/**
 * Make authenticated Sheets API request
 */
export async function sheetsRequest<T>(
  spreadsheetId: string,
  endpoint: string,
  method = 'GET',
  body?: unknown
): Promise<T> {
  const token = getGoogleToken();
  if (!token) {
    throw new HttpError('Google not authenticated. Run gmail-auth first.');
  }

  const path = endpoint.startsWith('/')
    ? `/v4/spreadsheets/${spreadsheetId}${endpoint}`
    : `/v4/spreadsheets/${spreadsheetId}/${endpoint}`;

  return httpRequest<T>({
    hostname: 'sheets.googleapis.com',
    path,
    method: method as 'GET' | 'POST' | 'PUT',
    headers: { Authorization: `Bearer ${token.access_token}` },
    body,
  });
}

export function isAuthenticated(): boolean {
  return getGoogleToken() !== null;
}

export function getAuthInstructions(): string {
  return `Google Sheets: Uses same auth as Gmail/Calendar. Required scope: spreadsheets`;
}
