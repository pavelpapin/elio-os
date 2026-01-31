/**
 * Watchdog Utilities
 */

import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.join(import.meta.dirname || __dirname, 'config.json');

export interface MonitorConfig {
  name: string;
  description: string;
  cron: string;
  timezone: string;
  graceMinutes: number;
  maxRetries: number;
  retryBackoffMinutes: number[];
  repairActions: string[];
  escalation: string;
}

export interface WatchdogConfig {
  monitors: MonitorConfig[];
  defaults: {
    graceMinutes: number;
    maxRetries: number;
    escalation: string;
    stuckThresholdMinutes: number;
  };
  make: {
    webhookUrl: string;
    checkIntervalMinutes: number;
  };
}

export function loadConfig(): WatchdogConfig {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw) as WatchdogConfig;
}
