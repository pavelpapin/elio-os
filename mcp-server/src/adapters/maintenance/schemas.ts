/**
 * Maintenance Adapter - Zod Schemas
 */

import { z } from 'zod';

export const maintenanceSchema = z.object({
  smokeTest: z.boolean().optional().describe('Run smoke test - verify integrations, skills, build (default: true)'),
  cleanLogs: z.boolean().optional().describe('Clean old log files (default: true)'),
  cleanCache: z.boolean().optional().describe('Clean pnpm cache (default: true)'),
  cleanTemp: z.boolean().optional().describe('Clean temp files (default: true)'),
  updateDeps: z.boolean().optional().describe('Update dependencies (default: true)'),
  gitMaintenance: z.boolean().optional().describe('Run git maintenance (default: true)'),
  dryRun: z.boolean().optional().describe('Dry run - show what would be done (default: false)'),
  output: z.enum(['markdown', 'json']).optional().describe('Output format (default: markdown)'),
});

export const smokeTestSchema = z.object({
  autoFix: z.boolean().optional().describe('Auto-fix issues if possible (default: true)'),
  output: z.enum(['markdown', 'json']).optional().describe('Output format (default: json)'),
});

export const cleanupSchema = z.object({
  logsRetentionDays: z.number().optional().describe('Days to keep logs (default: 7)'),
  dryRun: z.boolean().optional().describe('Dry run mode'),
});

export const depsSchema = z.object({
  update: z.boolean().optional().describe('Run update after audit (default: false)'),
});

export const gitSchema = z.object({
  dryRun: z.boolean().optional().describe('Dry run mode'),
});

export const autoTestSchema = z.object({
  scope: z.enum(['quick', 'changed', 'full']).optional().describe('Test scope (default: changed)'),
});
