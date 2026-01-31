/**
 * Day Review - System Metrics & API Health Collectors
 */

import * as fs from 'fs';
import { exec } from './utils.js';
import type { SystemMetrics, ApiHealth } from './types.js';

export function collectSystemMetrics(): SystemMetrics {
  const diskRaw = exec("df -h / | tail -1 | awk '{print $5}'", '0%');
  const memRaw = exec("free -m | grep Mem | awk '{print int($3/$2*100)\"%\"}'", '0%');
  const redisRaw = exec("redis-cli INFO memory 2>/dev/null | grep used_memory_human | cut -d: -f2", 'N/A');
  const uptimeRaw = exec("uptime -p 2>/dev/null || uptime", 'unknown');
  const loadRaw = exec("cat /proc/loadavg | awk '{print $1, $2, $3}'", '0 0 0');

  return {
    disk_usage: diskRaw,
    memory_usage: memRaw,
    redis_memory: redisRaw.trim() || undefined,
    uptime: uptimeRaw,
    load_average: loadRaw
  };
}

export function checkApiHealth(): ApiHealth {
  const health: ApiHealth = {};

  // Telegram
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN ||
    (() => {
      try {
        const config = JSON.parse(fs.readFileSync('/root/.claude/secrets/telegram.json', 'utf-8'));
        return config.bot_token;
      } catch { return ''; }
    })();

  if (telegramToken) {
    const result = exec(`curl -s -o /dev/null -w "%{http_code}" "https://api.telegram.org/bot${telegramToken}/getMe"`, '0');
    health.telegram = result === '200' ? 'ok' : 'down';
  } else {
    health.telegram = 'unknown';
  }

  // Supabase
  const supabaseUrl = process.env.SUPABASE_URL ||
    (() => {
      try {
        const config = JSON.parse(fs.readFileSync('/root/.claude/secrets/supabase.json', 'utf-8'));
        return config.url;
      } catch { return ''; }
    })();

  if (supabaseUrl) {
    const result = exec(`curl -s -o /dev/null -w "%{http_code}" "${supabaseUrl}/rest/v1/"`, '0');
    health.supabase = result === '200' ? 'ok' : (result === '401' ? 'ok' : 'down');
  } else {
    health.supabase = 'unknown';
  }

  // Redis
  const redisResult = exec('redis-cli ping 2>/dev/null', '');
  health.redis = redisResult === 'PONG' ? 'ok' : 'down';

  // Notion
  const hasNotion = fs.existsSync('/root/.claude/secrets/notion.json');
  health.notion = hasNotion ? 'ok' : 'unknown';

  return health;
}
