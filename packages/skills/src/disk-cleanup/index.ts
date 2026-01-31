/**
 * Disk Cleanup Skill
 * Cleans up disk space by removing temporary and cached files
 */

import { Skill, DiskCleanupInput, DiskCleanupOutput } from '../types.js';
import { ROOT_DIR, runCommand, remove } from '../runner.js';
import * as path from 'path';
import * as fs from 'fs';

const CLEANUP_TARGETS = [
  { path: '/tmp', pattern: 'elio-*', maxAgeDays: 1 },
  { path: '/root/.cache', pattern: '*', maxAgeDays: 7 },
  { path: path.join(ROOT_DIR, 'logs'), pattern: '*.log', maxAgeDays: 7 },
  { path: path.join(ROOT_DIR, 'debug'), pattern: '*', maxAgeDays: 3 }
];

export async function execute(input: DiskCleanupInput): Promise<DiskCleanupOutput> {
  const dryRun = input.dryRun ?? false;
  const itemsRemoved: string[] = [];
  const errors: string[] = [];
  let freedBytes = 0;

  for (const target of CLEANUP_TARGETS) {
    if (!fs.existsSync(target.path)) continue;

    const { stdout } = await runCommand(
      `find "${target.path}" -name "${target.pattern}" -mtime +${target.maxAgeDays} -type f 2>/dev/null || true`
    );

    const files = stdout.trim().split('\n').filter(Boolean);

    for (const file of files) {
      try {
        const stats = fs.statSync(file);
        const size = stats.size;

        if (dryRun) {
          itemsRemoved.push(`[DRY] ${file} (${Math.round(size / 1024)}KB)`);
          freedBytes += size;
        } else {
          remove(file);
          itemsRemoved.push(`${file} (${Math.round(size / 1024)}KB)`);
          freedBytes += size;
        }
      } catch (e) {
        errors.push(`Failed to process ${file}: ${e}`);
      }
    }
  }

  // Clean Docker if available
  const { exitCode: dockerAvailable } = await runCommand('docker info >/dev/null 2>&1');
  if (dockerAvailable === 0) {
    if (dryRun) {
      itemsRemoved.push('[DRY] Would run docker system prune');
    } else {
      const { stdout, exitCode } = await runCommand('docker system prune -f 2>&1 | tail -1');
      if (exitCode === 0 && stdout.includes('reclaimed')) {
        itemsRemoved.push(`Docker: ${stdout.trim()}`);
      }
    }
  }

  // Clean journal logs
  const { exitCode: journalAvailable } = await runCommand('which journalctl >/dev/null 2>&1');
  if (journalAvailable === 0) {
    if (dryRun) {
      itemsRemoved.push('[DRY] Would vacuum journal logs');
    } else {
      await runCommand('journalctl --vacuum-time=7d 2>/dev/null');
      itemsRemoved.push('Vacuumed journal logs older than 7 days');
    }
  }

  return {
    freed_mb: Math.round(freedBytes / (1024 * 1024)),
    items_removed: itemsRemoved,
    errors
  };
}

export const diskCleanup: Skill<DiskCleanupInput, DiskCleanupOutput> = {
  metadata: {
    name: 'disk-cleanup',
    version: '1.0.0',
    description: 'Clean up disk space',
    inputs: {
      dryRun: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Preview changes without executing'
      }
    },
    outputs: {
      result: {
        type: 'object',
        description: 'Cleanup results'
      }
    },
    tags: ['cleanup', 'maintenance', 'disk'],
    timeout: 300
  },
  execute
};

export { diskCleanup };
