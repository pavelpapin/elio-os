/**
 * Architecture auto-fixer
 * Deletes orphan files (dead code) and unused dependencies
 */

import { exec } from '../exec.js';
import type { FixResult } from '../types.js';
import type { ReviewData } from '../types.js';

export function fixOrphans(basePath: string, orphanFiles: string[]): FixResult {
  if (orphanFiles.length === 0) {
    return { actionId: 'arch-orphans', description: 'Remove orphan files', success: true, output: 'No orphans' };
  }

  const deleted: string[] = [];
  const failed: string[] = [];

  for (const file of orphanFiles) {
    const fullPath = `${basePath}/${file}`;
    const result = exec(`rm -f "${fullPath}" 2>&1`);
    if (result.exitCode === 0) {
      deleted.push(file);
    } else {
      failed.push(file);
    }
  }

  return {
    actionId: 'arch-orphans',
    description: `Deleted ${deleted.length}/${orphanFiles.length} orphan files`,
    success: failed.length === 0,
    output: deleted.map(f => `- ${f}`).join('\n').slice(0, 2000),
  };
}

export function fixUnusedDeps(mcpPath: string, deps: string[]): FixResult {
  if (deps.length === 0) {
    return { actionId: 'arch-unused-deps', description: 'Remove unused deps', success: true, output: 'None' };
  }

  const result = exec(`cd ${mcpPath} && pnpm remove ${deps.join(' ')} 2>&1`, 60_000);
  return {
    actionId: 'arch-unused-deps',
    description: `Remove ${deps.length} unused dependencies`,
    success: result.exitCode === 0,
    output: result.stdout.slice(0, 2000),
  };
}
