/**
 * Elio Bot Configuration
 */

import * as fs from 'fs';
import { ElioConfig } from '../types';
import { paths, createLogger } from '@elio/shared';

const logger = createLogger('telegram-bot:config');

const CONFIG_PATH = `${paths.root}/elio/config.json`;

const DEFAULT_CONFIG: ElioConfig = {
  telegram: {
    whitelist_enabled: false,
    whitelist: [],
    max_message_length: 4000,
    typing_interval_ms: 4000
  },
  brain: {
    cli_path: '/usr/local/bin/claude',
    default_max_turns: 3,
    timeout_seconds: 120
  },
  paths: {
    workspace: '/root/workspace'
  }
};

function loadConfig(): ElioConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    logger.info('Config not found, using defaults');
    return DEFAULT_CONFIG;
  }
}

export const config = loadConfig();

// Security: No fallback token - require env var to prevent accidental exposure
const envToken = process.env.TELEGRAM_BOT_TOKEN;
if (!envToken) {
  logger.error('FATAL: TELEGRAM_BOT_TOKEN environment variable is required');
  process.exit(1);
}
export const BOT_TOKEN = envToken;

export const CLAUDE_PATH = config.brain.cli_path;
export const WORKSPACE = config.paths.workspace;
export const MAX_TURNS = config.brain.default_max_turns;
export const TIMEOUT_MS = config.brain.timeout_seconds * 1000;

export const WHITELIST = config.telegram.whitelist.map(u => u.id);
export const WHITELIST_ENABLED = config.telegram.whitelist_enabled;
export const MAX_MESSAGE_LENGTH = config.telegram.max_message_length;
export const TYPING_INTERVAL = config.telegram.typing_interval_ms;
