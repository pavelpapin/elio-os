/**
 * Gmail API Client
 */

import { httpRequest, HttpError } from '../utils/http.js';
import { getAccessToken } from './credentials.js';

export async function gmailRequest<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new HttpError('Not authenticated. Run gmail-auth to authenticate.');
  }

  return httpRequest<T>({
    hostname: 'gmail.googleapis.com',
    path: `/gmail/v1/users/me${endpoint}`,
    method: method as 'GET' | 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body
  });
}

export function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export function parseEmailHeaders(headers: Array<{ name: string; value: string }>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const h of headers) {
    result[h.name.toLowerCase()] = h.value;
  }
  return result;
}
