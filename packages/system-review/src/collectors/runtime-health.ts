/**
 * Runtime health collector
 * MCP server status, cron jobs, integration health, secrets
 */

import { exec } from '../exec.js';
import type { RuntimeHealthData } from '../types.js';

export function collectRuntimeHealth(basePath: string): RuntimeHealthData {
  return {
    mcpServerUp: checkMcpServer(),
    cronJobsActive: checkCronJobs(),
    cronLastRun: getLastCronRun(basePath),
    integrations: checkIntegrations(basePath),
    secretsStatus: checkSecrets(basePath),
  };
}

function checkMcpServer(): boolean {
  // Check if MCP server process is running
  const result = exec(`pgrep -f "mcp-server" 2>/dev/null || pgrep -f "node.*mcp" 2>/dev/null`);
  if (result.stdout) return true;

  // Try health endpoint
  const curl = exec(`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null`, 5_000);
  return curl.stdout === '200';
}

function checkCronJobs(): boolean {
  const result = exec(`crontab -l 2>/dev/null | grep -v "^#" | grep -c "." 2>/dev/null`);
  return parseInt(result.stdout, 10) > 0;
}

function getLastCronRun(basePath: string): string | null {
  // Check last system review log
  const result = exec(
    `ls -t ${basePath}/logs/reviews/system/*.md 2>/dev/null | head -1`,
  );
  if (!result.stdout) return null;

  const filename = result.stdout.split('/').pop()?.replace('.md', '') ?? null;
  return filename;
}

function checkIntegrations(basePath: string): RuntimeHealthData['integrations'] {
  const integrations: RuntimeHealthData['integrations'] = [];

  // Telegram: validate bot token format
  const tgResult = exec(`cat ${basePath}/secrets/telegram.json 2>/dev/null`);
  if (tgResult.stdout) {
    try {
      const token = JSON.parse(tgResult.stdout).bot_token;
      integrations.push({
        name: 'telegram',
        healthy: Boolean(token && token.includes(':')),
        error: token ? undefined : 'Missing bot_token',
      });
    } catch {
      integrations.push({ name: 'telegram', healthy: false, error: 'Invalid JSON' });
    }
  } else {
    integrations.push({ name: 'telegram', healthy: false, error: 'Config file missing' });
  }

  // Notion: check for API key
  const notionResult = exec(`cat ${basePath}/secrets/notion.json 2>/dev/null`);
  if (notionResult.stdout) {
    try {
      const key = JSON.parse(notionResult.stdout).api_key;
      integrations.push({
        name: 'notion',
        healthy: Boolean(key && key.length > 10),
        error: key ? undefined : 'Missing api_key',
      });
    } catch {
      integrations.push({ name: 'notion', healthy: false, error: 'Invalid JSON' });
    }
  } else {
    integrations.push({ name: 'notion', healthy: false, error: 'Config file missing' });
  }

  // Anthropic: check for API key
  const anthropicResult = exec(`cat ${basePath}/secrets/anthropic.json 2>/dev/null`);
  if (anthropicResult.stdout) {
    try {
      const key = JSON.parse(anthropicResult.stdout).api_key;
      integrations.push({
        name: 'anthropic',
        healthy: Boolean(key && key.startsWith('sk-')),
        error: key ? undefined : 'Missing api_key',
      });
    } catch {
      integrations.push({ name: 'anthropic', healthy: false, error: 'Invalid JSON' });
    }
  } else {
    integrations.push({ name: 'anthropic', healthy: false, error: 'Config file missing' });
  }

  return integrations;
}

function checkSecrets(basePath: string): RuntimeHealthData['secretsStatus'] {
  const secretFiles = [
    'anthropic.json', 'openai.json', 'groq.json',
    'telegram.json', 'notion.json', 'gmail.json',
    'supabase.json', 'n8n.json',
  ];

  return secretFiles.map(name => {
    const path = `${basePath}/secrets/${name}`;
    const existsResult = exec(`test -f "${path}" && echo "yes"`);
    const exists = existsResult.stdout.includes('yes');

    let nonEmpty = false;
    if (exists) {
      const sizeResult = exec(`stat -c %s "${path}" 2>/dev/null`);
      nonEmpty = parseInt(sizeResult.stdout, 10) > 2; // More than just "{}"
    }

    return { name: name.replace('.json', ''), exists, nonEmpty };
  });
}
