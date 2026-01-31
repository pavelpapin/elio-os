/**
 * History collector
 * Reads past reports, calculates trends, finds recurring issues
 */

import { exec } from '../exec.js';
import type { HistoryData } from '../types.js';

export function collectHistory(basePath: string): HistoryData {
  const recentScores = readRecentScores(basePath);
  return {
    recentScores,
    trend: calculateTrend(recentScores),
    recurringIssues: findRecurringIssues(basePath),
  };
}

function readRecentScores(basePath: string): HistoryData['recentScores'] {
  const logDir = `${basePath}/logs/reviews/system`;
  const result = exec(`ls -t ${logDir}/*.md 2>/dev/null | head -7`);
  if (!result.stdout) return [];

  const scores: HistoryData['recentScores'] = [];

  for (const file of result.stdout.split('\n').filter(Boolean)) {
    const date = file.split('/').pop()?.replace('.md', '') ?? '';
    const scoreResult = exec(`grep -m1 "Health Score:" "${file}" 2>/dev/null`);
    const match = scoreResult.stdout.match(/(\d+)\/100/);
    if (match) {
      scores.push({ date, score: parseInt(match[1], 10) });
    }
  }

  return scores;
}

function calculateTrend(scores: HistoryData['recentScores']): HistoryData['trend'] {
  if (scores.length < 3) return 'stable';

  const recent3 = scores.slice(0, 3).map(s => s.score);
  const avg = recent3.reduce((a, b) => a + b, 0) / recent3.length;
  const oldest = recent3[recent3.length - 1];
  const newest = recent3[0];

  if (newest - oldest >= 10) return 'improving';
  if (oldest - newest >= 10) return 'degrading';
  return 'stable';
}

function findRecurringIssues(basePath: string): HistoryData['recurringIssues'] {
  const logDir = `${basePath}/logs/reviews/system`;
  const result = exec(`ls -t ${logDir}/*.md 2>/dev/null | head -5`);
  if (!result.stdout) return [];

  const issueCounts = new Map<string, number>();
  const patterns = [
    { regex: /(\d+) TypeScript errors?/i, label: 'TypeScript errors' },
    { regex: /(\d+) oversized/i, label: 'Oversized files' },
    { regex: /(\d+) circular/i, label: 'Circular dependencies' },
    { regex: /(\d+) orphan/i, label: 'Orphan files' },
    { regex: /(\d+) import violation/i, label: 'Import violations' },
    { regex: /Build.*FAIL/i, label: 'Build failure' },
    { regex: /Tests.*FAIL/i, label: 'Test failure' },
    { regex: /rolled back/i, label: 'Rollback triggered' },
  ];

  for (const file of result.stdout.split('\n').filter(Boolean)) {
    const content = exec(`cat "${file}" 2>/dev/null`);
    if (!content.stdout) continue;

    for (const pattern of patterns) {
      if (pattern.regex.test(content.stdout)) {
        issueCounts.set(pattern.label, (issueCounts.get(pattern.label) ?? 0) + 1);
      }
    }
  }

  return [...issueCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([issue, occurrences]) => ({ issue, occurrences }))
    .sort((a, b) => b.occurrences - a.occurrences);
}
