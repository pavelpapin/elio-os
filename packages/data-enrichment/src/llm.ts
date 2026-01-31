/**
 * LLM abstraction — Claude (shell), OpenAI (HTTP), Groq (HTTP)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { withResilience } from '@elio/shared';
import type { LLMCallOptions } from './types.js';

const SECRETS_PATH = '/root/.claude/secrets/.env';
const SECRETS_DIR = '/root/.claude/secrets';
const CLI_USER = 'elio';

let envLoaded = false;
function ensureEnv(): void {
  if (envLoaded) return;
  try {
    const content = readFileSync(SECRETS_PATH, 'utf-8');
    for (const line of content.split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* ignore */ }
  const jsonMap: Record<string, string> = {
    'anthropic.json': 'ANTHROPIC_API_KEY',
    'openai.json': 'OPENAI_API_KEY',
    'groq.json': 'GROQ_API_KEY',
  };
  for (const [file, envKey] of Object.entries(jsonMap)) {
    if (!process.env[envKey]) {
      try {
        const data = JSON.parse(readFileSync(`${SECRETS_DIR}/${file}`, 'utf-8'));
        if (data.api_key) process.env[envKey] = data.api_key;
      } catch { /* ignore */ }
    }
  }
  envLoaded = true;
}

export async function callLLM(opts: LLMCallOptions): Promise<unknown> {
  ensureEnv();
  const retries = opts.maxRetries ?? 2;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const raw = await callProvider(opts);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (opts.outputSchema) {
        const result = opts.outputSchema.safeParse(parsed);
        if (!result.success) {
          if (attempt < retries) continue;
          throw new Error(`Schema validation failed: ${result.error.message}`);
        }
        return result.data;
      }
      return parsed;
    } catch (err) {
      if (attempt >= retries) throw err;
    }
  }
  throw new Error('LLM call failed after all retries');
}

async function callProvider(opts: LLMCallOptions): Promise<string> {
  const service = opts.provider === 'claude' ? 'anthropic' : opts.provider;

  return withResilience(service, async () => {
    switch (opts.provider) {
      case 'claude': return callClaude(opts);
      case 'openai': return callOpenAI(opts);
      case 'groq': return callGroq(opts);
    }
  });
}

function callClaude(opts: LLMCallOptions): string {
  const fullPrompt = `${opts.prompt}\n\n## INPUT\n${opts.input}\n\nReturn ONLY valid JSON, no markdown, no explanation.`;
  const timeout = opts.timeoutMs ?? 300_000;

  const tmpDir = mkdtempSync(join(tmpdir(), 'elio-llm-'));
  const promptFile = join(tmpDir, 'prompt.txt');
  writeFileSync(promptFile, fullPrompt, 'utf-8');

  try {
    const result = execSync(
      `sudo -u ${CLI_USER} claude --print --dangerously-skip-permissions < ${escapeShell(promptFile)}`,
      { encoding: 'utf-8', timeout, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    return result.trim();
  } finally {
    try { execSync(`rm -rf ${escapeShell(tmpDir)}`); } catch { /* cleanup */ }
  }
}

async function callOpenAI(opts: LLMCallOptions): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');

  return callOpenAICompatible(
    'https://api.openai.com/v1/chat/completions',
    key,
    'gpt-4o',
    opts,
  );
}

async function callGroq(opts: LLMCallOptions): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');

  return callOpenAICompatible(
    'https://api.groq.com/openai/v1/chat/completions',
    key,
    'llama-3.1-70b-versatile',
    opts,
  );
}

async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  opts: LLMCallOptions,
): Promise<string> {
  const timeout = opts.timeoutMs ?? 120_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: opts.prompt },
          { role: 'user', content: `${opts.input}\n\nReturn ONLY valid JSON.` },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`${model} API error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  } finally {
    clearTimeout(timer);
  }
}

function escapeShell(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

export function loadPrompt(promptName: string): string {
  const path = `/root/.claude/workflows/data-enrichment/prompts/${promptName}`;
  return readFileSync(path, 'utf-8');
}

export function hasProvider(provider: 'openai' | 'groq'): boolean {
  ensureEnv();
  const key = provider === 'openai' ? 'OPENAI_API_KEY' : 'GROQ_API_KEY';
  return !!process.env[key];
}
