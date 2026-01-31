/**
 * System Configuration - Reviews, Schedules, Collectors
 */

import { ELIO_ROOT } from '@elio/shared';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ReviewConfig, Collector, ScheduledScript } from './types.js';

// Load Notion database IDs from secrets (not hardcoded)
let notionIds: Record<string, string> = {};
try {
  notionIds = JSON.parse(readFileSync(join(ELIO_ROOT, 'secrets', 'notion-ids.json'), 'utf-8'));
} catch {
  // Will use empty strings if file missing
}

export const collectors: Record<string, Collector> = {
  'day-review': {
    enabled: true,
    name: 'Day Collector',
    description: 'Собирает данные дня перед запуском агентов: ошибки, изменения, метрики',
    schedule: {
      cron: '0 0 * * *',
      description: 'Daily at 00:00 (first, before all agents)',
    },
    workflow: 'day-review',
    outputs: {
      path: `${ELIO_ROOT}/logs/daily/{date}/day-summary.json`,
      notify: false,
    },
  },
};

export const reviews: Record<string, ReviewConfig> = {
  'system-review': {
    enabled: true,
    name: 'System Review',
    description: 'Nightly technical review: code, architecture, security, infrastructure',
    workflow: 'system-review',
    schedule: {
      cron: '0 3 * * *',
      description: 'Daily at 03:00 UTC',
    },
    permissions: {
      autoFix: {
        enabled: true,
        scope: ['code', 'config'],
        maxChanges: 10,
      },
    },
    reports: {
      telegram: true,
      notion: true,
      notionDb: 'System Reviews',
      notionDbId: notionIds.systemReviews || '',
      localPath: `${ELIO_ROOT}/logs/reviews/system`,
    },
    backlog: {
      type: 'technical',
      notionSync: true,
      notionDb: 'Technical Backlog',
      notionDbId: notionIds.technicalBacklog || '',
    },
  },

  'product-review': {
    enabled: true,
    name: 'Product Review',
    description: 'Nightly product quality review: feedback, errors, metrics',
    workflow: 'product-review',
    schedule: {
      cron: '30 3 * * *',
      description: 'Daily at 03:30 UTC (after system-review)',
    },
    permissions: {
      autoFix: {
        enabled: true,
        scope: ['docs', 'config'],
        fileTypes: ['.md', '.json'],
        excludePaths: ['secrets/', 'node_modules/'],
        maxChanges: 5,
      },
    },
    reports: {
      telegram: true,
      notion: true,
      notionDb: 'Product Reviews',
      notionDbId: notionIds.productReviews || '',
      localPath: `${ELIO_ROOT}/logs/reviews/product`,
    },
    backlog: {
      type: 'product',
      notionSync: true,
      notionDb: 'Product Backlog',
      notionDbId: notionIds.productBacklog || '',
    },
  },
};

export const scheduledScripts: ScheduledScript[] = [
  {
    name: 'backlog-sync',
    description: 'Bidirectional sync between Supabase and Notion backlogs',
    script: 'scripts/sync-backlog-to-notion/index.ts',
    cron: '0 */6 * * *',
    timezone: 'UTC',
    enabled: true,
    config: {
      direction: 'full',
      notifyOnError: true,
    },
  },
];

export const standup = {
  enabled: true,
  time: '08:00',
  channel: 'telegram' as const,
  includeReviews: ['system-review', 'product-review'],
};

export const weeklySummary = {
  enabled: true,
  day: 'sunday' as const,
  time: '20:00',
};
