/**
 * Gmail Types
 */

export interface GoogleToken {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body?: string;
  labels: string[];
}

export interface GoogleCredentials {
  installed?: { client_id: string; client_secret: string; redirect_uris: string[] };
  web?: { client_id: string; client_secret: string; redirect_uris: string[] };
}

export interface GmailListResponse {
  messages?: Array<{ id: string }>;
}

export interface GmailMessageDetail {
  id: string;
  threadId: string;
  snippet: string;
  labelIds: string[];
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
  };
}
