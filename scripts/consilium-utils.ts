/**
 * Utility functions for Consilium
 */

import * as fs from 'fs';
import { execSync } from 'child_process';
import { CONFIG } from './consilium-types.js';

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function exec(cmd: string, fallback: string = ''): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 30000 }).trim();
  } catch {
    return fallback;
  }
}

export function readFileContent(filepath: string, maxLines: number = CONFIG.maxLinesPerFile): string {
  if (!fs.existsSync(filepath)) return '';
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.split('\n');
    if (lines.length > maxLines) {
      return lines.slice(0, maxLines).join('\n') + `\n... (${lines.length - maxLines} more lines)`;
    }
    return content;
  } catch {
    return '';
  }
}

export function sendTelegram(message: string): void {
  try {
    const configPath = '/root/.claude/secrets/telegram.json';
    if (!fs.existsSync(configPath)) return;

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const token = config.bot_token;
    const chatId = config.default_chat_id;

    if (!token || !chatId) return;

    execSync(
      `curl -s -X POST "https://api.telegram.org/bot${token}/sendMessage" ` +
      `-d "chat_id=${chatId}" ` +
      `-d "text=${encodeURIComponent(message)}" ` +
      `-d "parse_mode=HTML"`,
      { timeout: 10000, stdio: 'ignore' }
    );
  } catch { /* ignore */ }
}
