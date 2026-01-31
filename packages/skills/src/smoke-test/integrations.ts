/**
 * Smoke Test - Integration Tests
 */

import * as path from 'path';
import { IntegrationStatus } from '../types.js';
import { ROOT_DIR, runCommand, readJsonFile } from '../runner.js';
import { httpGet } from './http.js';
import type {
  TelegramCredentials,
  NotionCredentials,
  SlackCredentials,
  PerplexityCredentials,
  SupabaseCredentials,
} from './types.js';

const SECRETS_DIR = path.join(ROOT_DIR, 'secrets');

export async function testTelegram(): Promise<IntegrationStatus> {
  const creds = readJsonFile<TelegramCredentials>(path.join(SECRETS_DIR, 'telegram.json'));
  if (!creds?.bot_token) return { status: 'no_credentials' };

  const start = Date.now();
  try {
    const { body } = await httpGet(`https://api.telegram.org/bot${creds.bot_token}/getMe`);
    const latency = Date.now() - start;
    if (body.includes('"ok":true')) {
      return { status: 'ok', latency_ms: latency };
    }
    return { status: 'api_error' };
  } catch {
    return { status: 'api_error' };
  }
}

export async function testNotion(): Promise<IntegrationStatus> {
  const creds = readJsonFile<NotionCredentials>(path.join(SECRETS_DIR, 'notion.json'));
  if (!creds?.api_key) return { status: 'no_credentials' };

  const start = Date.now();
  try {
    const { body } = await httpGet('https://api.notion.com/v1/users/me', {
      'Authorization': `Bearer ${creds.api_key}`,
      'Notion-Version': '2022-06-28'
    });
    const latency = Date.now() - start;
    if (body.includes('"object":"user"')) {
      return { status: 'ok', latency_ms: latency };
    }
    return { status: 'api_error' };
  } catch {
    return { status: 'api_error' };
  }
}

export async function testGitHub(): Promise<IntegrationStatus> {
  const start = Date.now();
  const { exitCode } = await runCommand('gh auth status');
  const latency = Date.now() - start;

  if (exitCode === 0) {
    return { status: 'ok', latency_ms: latency };
  }
  return { status: 'not_authenticated' };
}

export async function testPerplexity(): Promise<IntegrationStatus> {
  const creds = readJsonFile<PerplexityCredentials>(path.join(SECRETS_DIR, 'perplexity.json'));
  if (!creds?.api_key || creds.api_key.length < 10) {
    return { status: 'no_credentials' };
  }
  return { status: 'ok', note: 'credentials_only' };
}

export async function testSlack(): Promise<IntegrationStatus> {
  const creds = readJsonFile<SlackCredentials>(path.join(SECRETS_DIR, 'slack.json'));
  if (!creds?.bot_token) return { status: 'no_credentials' };

  const start = Date.now();
  try {
    const { body } = await httpGet('https://slack.com/api/auth.test', {
      'Authorization': `Bearer ${creds.bot_token}`
    });
    const latency = Date.now() - start;
    if (body.includes('"ok":true')) {
      return { status: 'ok', latency_ms: latency };
    }
    return { status: 'api_error' };
  } catch {
    return { status: 'api_error' };
  }
}

export async function testSupabase(): Promise<IntegrationStatus> {
  const creds = readJsonFile<SupabaseCredentials>(path.join(SECRETS_DIR, 'supabase.json'));
  if (!creds?.url || !creds?.anon_key) return { status: 'no_credentials' };

  const start = Date.now();
  try {
    const { status } = await httpGet(`${creds.url}/rest/v1/`, {
      'apikey': creds.anon_key,
      'Authorization': `Bearer ${creds.anon_key}`
    });
    const latency = Date.now() - start;
    if (status >= 200 && status < 400) {
      return { status: 'ok', latency_ms: latency };
    }
    return { status: 'api_error' };
  } catch {
    return { status: 'api_error' };
  }
}
