/**
 * Main Review Logic
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, extname, relative } from 'path';
import { resetCounter } from './utils.js';
import { analyzeSecurityIssues } from './security.js';
import { analyzeFileStats, analyzeArchitectureIssues } from './stats.js';
import { analyzeDependencies } from './deps.js';
import { generateSummary } from './formatter.js';
import type { Issue, ReviewResult, ReviewConfig, ReviewStats } from '../types.js';

async function getFiles(dir: string, excludePatterns: string[]): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(process.cwd(), fullPath);

    if (excludePatterns.some((p) => relativePath.includes(p))) continue;

    if (entry.isDirectory()) {
      files.push(...(await getFiles(fullPath, excludePatterns)));
    } else if (entry.isFile()) {
      if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(entry.name))) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

export async function reviewCode(
  targetPath: string,
  config: Partial<ReviewConfig> = {}
): Promise<ReviewResult> {
  const fullConfig: ReviewConfig = {
    maxFileLines: config.maxFileLines ?? 200,
    maxFunctionLines: config.maxFunctionLines ?? 50,
    checkSecurity: config.checkSecurity ?? true,
    checkArchitecture: config.checkArchitecture ?? true,
    checkQuality: config.checkQuality ?? true,
    checkDependencies: config.checkDependencies ?? true,
    excludePatterns: config.excludePatterns ?? ['node_modules', 'dist', '.git', 'coverage'],
  };

  resetCounter();
  const issues: Issue[] = [];
  let totalLines = 0;

  const pathStat = await stat(targetPath);
  const files = pathStat.isDirectory()
    ? await getFiles(targetPath, fullConfig.excludePatterns)
    : [targetPath];

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const relativePath = relative(targetPath, file) || file;

    if (fullConfig.checkSecurity) {
      issues.push(...analyzeSecurityIssues(content, relativePath));
    }

    const stats = analyzeFileStats(content, relativePath);
    totalLines += stats.lines;

    if (fullConfig.checkArchitecture || fullConfig.checkQuality) {
      issues.push(...analyzeArchitectureIssues(stats, fullConfig));
    }
  }

  if (fullConfig.checkDependencies && pathStat.isDirectory()) {
    issues.push(...(await analyzeDependencies(targetPath)));
  }

  const stats: ReviewStats = {
    totalFiles: files.length,
    totalLines,
    issuesBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    issuesByCategory: { security: 0, architecture: 0, quality: 0, performance: 0, dependency: 0, style: 0 },
  };

  for (const issue of issues) {
    stats.issuesBySeverity[issue.severity]++;
    stats.issuesByCategory[issue.category]++;
  }

  return {
    timestamp: new Date().toISOString(),
    path: targetPath,
    issues,
    stats,
    summary: generateSummary(issues, stats),
  };
}
