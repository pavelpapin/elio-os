/**
 * Nightly Consilium - Data Collection
 * Functions for gathering changes and files to analyze
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { createFileLogger } from '../../utils/file-logger.js';
import type { DailyChanges } from './types.js';

const MCP_SERVER_PATH = '/root/.claude/mcp-server';

/**
 * Collect data about changes since last run
 */
export async function collectDailyChanges(
  logger: ReturnType<typeof createFileLogger>
): Promise<DailyChanges> {
  logger.info('Collecting daily changes...');

  let gitDiff = '';
  let changedFiles: string[] = [];

  try {
    gitDiff = execSync('git diff HEAD~10 --stat 2>/dev/null || echo "No git history"', {
      cwd: MCP_SERVER_PATH,
      encoding: 'utf-8'
    });

    const diffFiles = execSync('git diff HEAD~10 --name-only 2>/dev/null || echo ""', {
      cwd: MCP_SERVER_PATH,
      encoding: 'utf-8'
    });

    changedFiles = diffFiles.split('\n').filter(f => f.trim());
  } catch {
    logger.warn('Git diff failed');
  }

  const errorLogs: string[] = [];
  const today = new Date().toISOString().split('T')[0];
  const errorLogPath = `/root/.claude/logs/errors/${today}.jsonl`;

  if (existsSync(errorLogPath)) {
    const content = readFileSync(errorLogPath, 'utf-8');
    errorLogs.push(...content.split('\n').filter(l => l.trim()).slice(-50));
  }

  return {
    changedFiles,
    gitDiff,
    errorLogs,
    metrics: {}
  };
}

/**
 * Find all TypeScript files recursively
 */
export function findTsFiles(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;

  const items = readdirSync(dir);

  for (const item of items) {
    if (item === 'node_modules' || item === 'dist' || item === '.git') continue;

    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      findTsFiles(fullPath, files);
    } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

export { MCP_SERVER_PATH };
