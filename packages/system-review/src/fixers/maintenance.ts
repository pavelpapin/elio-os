/**
 * Maintenance auto-fixer
 * Log rotation, cache cleanup, git gc
 */

import { exec } from '../exec.js';
import type { FixResult } from '../types.js';

export function fixMaintenance(basePath: string): FixResult {
  const results: string[] = [];

  const oldLogs = exec(
    `find ${basePath}/logs -type f -mtime +30 -delete 2>&1 && echo "Old logs cleaned"`,
  );
  results.push(oldLogs.stdout);

  const gitGc = exec(`git -C ${basePath} gc --auto 2>&1`, 60_000);
  results.push(`git gc: ${gitGc.stdout}`);

  const storePrune = exec(`pnpm store prune 2>&1`, 60_000);
  results.push(`pnpm store prune: ${storePrune.stdout}`);

  return {
    actionId: 'maintenance-fix',
    description: 'Log rotation + git gc + pnpm store prune',
    success: true,
    output: results.join('\n').slice(0, 2000),
  };
}
