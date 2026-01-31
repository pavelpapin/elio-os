/**
 * Gmail Public API Functions
 */

import { isGoogleAuthenticated } from '../utils/credentials.js';
import { loadCredentials } from './credentials.js';
import { gmailRequest, decodeBase64Url, parseEmailHeaders } from './client.js';
import type { EmailMessage, GmailListResponse, GmailMessageDetail } from './types.js';

export async function listEmails(query = '', maxResults = 10): Promise<EmailMessage[]> {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  if (query) params.set('q', query);

  const response = await gmailRequest<GmailListResponse>(`/messages?${params}`);
  if (!response.messages) return [];

  const messages: EmailMessage[] = [];
  for (const msg of response.messages.slice(0, maxResults)) {
    const detail = await gmailRequest<GmailMessageDetail>(`/messages/${msg.id}`);
    const headers = parseEmailHeaders(detail.payload.headers);

    messages.push({
      id: detail.id,
      threadId: detail.threadId,
      from: headers['from'] || '',
      to: headers['to'] || '',
      subject: headers['subject'] || '(no subject)',
      date: headers['date'] || '',
      snippet: detail.snippet,
      labels: detail.labelIds || []
    });
  }

  return messages;
}

export async function getEmail(messageId: string): Promise<EmailMessage | null> {
  const detail = await gmailRequest<GmailMessageDetail>(`/messages/${messageId}?format=full`);
  if (!detail.id) return null;

  const headers = parseEmailHeaders(detail.payload.headers);

  let body = '';
  if (detail.payload.body?.data) {
    body = decodeBase64Url(detail.payload.body.data);
  } else if (detail.payload.parts) {
    const textPart = detail.payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      body = decodeBase64Url(textPart.body.data);
    }
  }

  return {
    id: detail.id,
    threadId: detail.threadId,
    from: headers['from'] || '',
    to: headers['to'] || '',
    subject: headers['subject'] || '(no subject)',
    date: headers['date'] || '',
    snippet: detail.snippet,
    body,
    labels: detail.labelIds || []
  };
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ].join('\r\n');

  const encodedEmail = Buffer.from(email).toString('base64url');

  try {
    const response = await gmailRequest<{ id?: string; error?: { message: string } }>(
      '/messages/send',
      'POST',
      { raw: encodedEmail }
    );
    if (response.id) {
      return { success: true, messageId: response.id };
    }
    return { success: false, error: response.error?.message || 'Unknown error' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function isAuthenticated(): boolean {
  return isGoogleAuthenticated() && loadCredentials() !== null;
}

export function getAuthInstructions(): string {
  return `
Gmail Integration Setup:

1. Create a Google Cloud project
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Download credentials.json to /root/.claude/secrets/google-credentials.json
5. Run gmail-auth script to get token
`;
}
