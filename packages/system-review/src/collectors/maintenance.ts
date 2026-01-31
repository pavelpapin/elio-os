/**
 * Maintenance data collector
 * Old logs, cache sizes, git garbage
 */

import { exec } from '../exec.js';
import type { MaintenanceData } from '../types.js';

export function collectMaintenance(basePath: string): MaintenanceData {
  return {
    oldLogFiles: findOldLogs(basePath),
    cacheSizeMb: getCacheSize(basePath),
    gitGarbageMb: getGitGarbage(basePath),
  };
}

function findOldLogs(basePath: string): MaintenanceData['oldLogFiles'] {
  const result = exec(
    `find ${basePath}/logs -type f -mtime +30 -printf "%p %s %T@\n" 2>/dev/null | head -50`,
  );
  if (!result.stdout) return [];

  const now = Date.now() / 1000;
  return result.stdout.split('\n').filter(Boolean).map((line) => {
    const parts = line.split(' ');
    const path = parts[0];
    const sizeBytes = parseInt(parts[1], 10) || 0;
    const mtime = parseFloat(parts[2]) || now;
    const ageDays = Math.floor((now - mtime) / 86400);
    return { path, ageDays, sizeMb: Math.round(sizeBytes / 1024 / 1024 * 10) / 10 };
  });
}

function getCacheSize(basePath: string): number {
  const result = exec(
    `du -sm ${basePath}/node_modules ${basePath}/mcp-server/node_modules ${basePath}/packages/*/dist 2>/dev/null | awk '{s+=$1} END {print s}'`,
  );
  return parseInt(result.stdout, 10) || 0;
}

function getGitGarbage(basePath: string): number {
  const result = exec(
    `git -C ${basePath} count-objects -v 2>/dev/null | grep size-garbage | awk '{print $2}'`,
  );
  const kb = parseInt(result.stdout, 10) || 0;
  return Math.round(kb / 1024 * 10) / 10;
}
