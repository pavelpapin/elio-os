/**
 * Nightly Workflow Configuration
 */

import { readFileSync, existsSync } from 'fs';

const CONFIG_PATH = '/root/.claude/config/nightly.json';

export interface NightlyConfig {
  enabled: boolean;
  autoFix: {
    enabled: boolean;
    maxFixes: number;
    dryRun: boolean;
  };
  healthCheck: {
    enabled: boolean;
    sources: string[];
  };
  notifications: {
    telegram: boolean;
    onlyOnIssues: boolean;
  };
}

/**
 * Load nightly configuration
 */
export function getConfig(): NightlyConfig {
  if (existsSync(CONFIG_PATH)) {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  }

  // Default config
  return {
    enabled: true,
    autoFix: {
      enabled: true,
      maxFixes: 10,
      dryRun: false
    },
    healthCheck: {
      enabled: true,
      sources: ['perplexity', 'jina', 'ddg', 'google_news', 'youtube', 'linkedin']
    },
    notifications: {
      telegram: true,
      onlyOnIssues: false
    }
  };
}
