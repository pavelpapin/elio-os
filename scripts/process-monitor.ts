#!/usr/bin/env npx tsx
/**
 * Process Monitor Script
 * Monitors system processes, memory, and sends alerts if issues detected.
 *
 * Usage:
 *   npx tsx scripts/process-monitor.ts          # Check and alert
 *   npx tsx scripts/process-monitor.ts --status # Show status only
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { paths } from '@elio/shared';
import {
  type ProcessInfo,
  type SystemStatus,
  MEMORY_THRESHOLD_MB,
  CPU_THRESHOLD_PERCENT,
  getElioProcesses,
  getMemoryUsage,
  getLoadAverage,
  getUptime,
  checkRedis,
} from './process-monitor-checks.js';

export type { ProcessInfo, SystemStatus };

function getSystemStatus(): SystemStatus {
  const processes = getElioProcesses();
  const memory = getMemoryUsage();
  const loadAvg = getLoadAverage();
  const issues: string[] = [];

  for (const proc of processes) {
    if (proc.memory > MEMORY_THRESHOLD_MB) {
      issues.push(`Process ${proc.name} (PID ${proc.pid}) using ${proc.memory}MB memory`);
    }
    if (proc.cpu > CPU_THRESHOLD_PERCENT) {
      issues.push(`Process ${proc.name} (PID ${proc.pid}) using ${proc.cpu}% CPU`);
    }
  }

  if (memory.percent > 90) issues.push(`System memory at ${memory.percent}%`);
  if (!checkRedis()) issues.push('Redis is not responding');

  const cpuCount = parseInt(execSync('nproc', { encoding: 'utf-8' }).trim()) || 4;
  if (loadAvg[0] > cpuCount * 1.5) issues.push(`High load average: ${loadAvg[0].toFixed(2)}`);

  return {
    processes, totalMemory: memory.total, usedMemory: memory.used,
    memoryPercent: memory.percent, loadAvg, uptime: getUptime(), issues
  };
}

async function sendTelegramAlert(message: string): Promise<void> {
  try {
    const credsPath = paths.credentials.telegram;
    if (!existsSync(credsPath)) return;
    const creds = JSON.parse(readFileSync(credsPath, 'utf-8'));
    const { bot_token, chat_id } = creds;
    if (!bot_token || !chat_id) return;
    await fetch(`https://api.telegram.org/bot${bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, text: message, parse_mode: 'Markdown' })
    });
  } catch {
    // Silent fail
  }
}

function formatStatus(status: SystemStatus): string {
  let output = '\n=== Elio Process Monitor ===\n\n';
  output += `System Uptime: ${status.uptime}\n`;
  output += `Memory: ${status.usedMemory}MB / ${status.totalMemory}MB (${status.memoryPercent}%)\n`;
  output += `Load Average: ${status.loadAvg.map(l => l.toFixed(2)).join(', ')}\n`;
  output += `Redis: ${checkRedis() ? 'OK' : 'DOWN'}\n\n`;

  output += '--- Active Processes ---\n';
  if (status.processes.length === 0) {
    output += '  No Elio processes running\n';
  } else {
    for (const proc of status.processes) {
      output += `  [${proc.pid}] ${proc.name} - CPU: ${proc.cpu}%, Mem: ${proc.memory}MB, Time: ${proc.runtime}\n`;
    }
  }

  output += '\n--- Issues ---\n';
  if (status.issues.length === 0) {
    output += '  No issues detected\n';
  } else {
    for (const issue of status.issues) output += `  ⚠️  ${issue}\n`;
  }
  return output;
}

async function main() {
  const statusOnly = process.argv.includes('--status');
  const status = getSystemStatus();
  console.log(formatStatus(status));

  if (!statusOnly && status.issues.length > 0) {
    const alertMessage = `⚠️ *Elio Process Alert*\n\n${status.issues.map(i => `• ${i}`).join('\n')}`;
    await sendTelegramAlert(alertMessage);
    console.log('\nAlert sent to Telegram');
  }

  process.exit(status.issues.length > 0 ? 1 : 0);
}

main().catch(console.error);
