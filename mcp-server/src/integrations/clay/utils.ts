/**
 * Clay Integration Utilities
 * Helper functions for credentials and results management
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import type { ClayCredentials, ResultEntry } from './types.js';

const CREDENTIALS_PATH = '/root/.claude/secrets/clay.json';
const RESULTS_PATH = '/root/.claude/data/clay-results';

export const SETUP_INSTRUCTIONS = `
Clay требует ручной настройки в UI:

1. Создай таблицу в Clay
2. Нажми "+ Add" внизу таблицы
3. Выбери "Monitor webhook"
4. Скопируй URL вебхука
5. Вызови: configure({ webhook_url: "скопированный_url" })

После этого можно отправлять данные через sendToWebhook()
`.trim();

// Ensure results directory exists
if (!existsSync(RESULTS_PATH)) {
  mkdirSync(RESULTS_PATH, { recursive: true });
}

export function getCredentials(): ClayCredentials | null {
  if (!existsSync(CREDENTIALS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveCredentials(creds: ClayCredentials): void {
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2));
}

export function saveResult(id: string, data: Record<string, unknown>): void {
  const path = `${RESULTS_PATH}/${id}.json`;
  writeFileSync(path, JSON.stringify({
    ...data,
    received_at: new Date().toISOString()
  }, null, 2));
}

export function loadResult(id: string): Record<string, unknown> | null {
  const path = `${RESULTS_PATH}/${id}.json`;
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

export function getAllResults(): ResultEntry[] {
  if (!existsSync(RESULTS_PATH)) return [];

  const { readdirSync } = require('fs');
  const files = readdirSync(RESULTS_PATH) as string[];

  return files
    .filter((f: string) => f.endsWith('.json'))
    .map((f: string) => {
      try {
        const data = JSON.parse(readFileSync(`${RESULTS_PATH}/${f}`, 'utf-8'));
        return {
          id: f.replace('.json', ''),
          received_at: data.received_at || 'unknown'
        };
      } catch {
        return { id: f.replace('.json', ''), received_at: 'unknown' };
      }
    });
}
