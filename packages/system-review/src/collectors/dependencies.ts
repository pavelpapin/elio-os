/**
 * Dependencies collector
 * Outdated deps, depth, duplicates, license issues
 */

import { exec } from '../exec.js';
import type { DependenciesData } from '../types.js';

export function collectDependencies(projectPath: string): DependenciesData {
  return {
    outdated: findOutdated(projectPath),
    maxDepth: measureDepth(projectPath),
    duplicates: findDuplicates(projectPath),
    licenseIssues: checkLicenses(projectPath),
  };
}

function findOutdated(path: string): DependenciesData['outdated'] {
  const result = exec(`cd ${path} && pnpm outdated --json 2>/dev/null`, 60_000);
  if (!result.stdout) return [];

  try {
    const data = JSON.parse(result.stdout);
    const outdated: DependenciesData['outdated'] = [];

    for (const [name, info] of Object.entries(data)) {
      const entry = info as Record<string, string>;
      const current = entry.current ?? '';
      const latest = entry.latest ?? '';
      if (!current || !latest || current === latest) continue;

      const currentMajor = current.split('.')[0];
      const latestMajor = latest.split('.')[0];
      const currentMinor = current.split('.')[1];
      const latestMinor = latest.split('.')[1];

      let type: 'major' | 'minor' | 'patch' = 'patch';
      if (currentMajor !== latestMajor) type = 'major';
      else if (currentMinor !== latestMinor) type = 'minor';

      outdated.push({ name, current, latest, type });
    }

    return outdated;
  } catch {
    return [];
  }
}

function measureDepth(path: string): number {
  const result = exec(`cd ${path} && pnpm list --depth=20 --json 2>/dev/null | head -5000`, 30_000);
  if (!result.stdout) return 0;

  try {
    const json = JSON.parse(result.stdout);
    return measureJsonDepth(json, 0);
  } catch {
    return 0;
  }
}

function measureJsonDepth(obj: unknown, depth: number): number {
  if (depth > 20) return depth;
  if (!obj || typeof obj !== 'object') return depth;
  const record = obj as Record<string, unknown>;
  const deps = record.dependencies ?? record.devDependencies;
  if (!deps || typeof deps !== 'object') return depth;

  let max = depth;
  for (const val of Object.values(deps as Record<string, unknown>)) {
    max = Math.max(max, measureJsonDepth(val, depth + 1));
  }
  return max;
}

function findDuplicates(path: string): string[] {
  const result = exec(`cd ${path} && pnpm list --json 2>/dev/null | head -10000`, 30_000);
  if (!result.stdout) return [];

  try {
    const seen = new Map<string, number>();
    countPackages(JSON.parse(result.stdout), seen);
    return [...seen.entries()]
      .filter(([, count]) => count > 1)
      .map(([name]) => name)
      .slice(0, 20);
  } catch {
    return [];
  }
}

function countPackages(obj: unknown, seen: Map<string, number>): void {
  if (!obj || typeof obj !== 'object') return;
  const record = obj as Record<string, unknown>;
  const deps = record.dependencies as Record<string, unknown> | undefined;
  if (!deps) return;

  for (const [name, val] of Object.entries(deps)) {
    seen.set(name, (seen.get(name) ?? 0) + 1);
    countPackages(val, seen);
  }
}

const ALLOWED_LICENSES = new Set([
  'MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause',
  'Apache-2.0', '0BSD', 'CC0-1.0', 'Unlicense',
  'BlueOak-1.0.0', 'CC-BY-4.0', 'Python-2.0',
]);

function checkLicenses(path: string): DependenciesData['licenseIssues'] {
  const result = exec(`cd ${path} && pnpm licenses list --json 2>/dev/null`, 30_000);
  if (!result.stdout) return [];

  try {
    const data = JSON.parse(result.stdout);
    const issues: DependenciesData['licenseIssues'] = [];

    for (const [license, packages] of Object.entries(data)) {
      if (ALLOWED_LICENSES.has(license)) continue;
      const pkgs = packages as Array<{ name?: string }>;
      for (const pkg of Array.isArray(pkgs) ? pkgs : []) {
        issues.push({ name: pkg.name ?? 'unknown', license });
      }
    }

    return issues.slice(0, 20);
  } catch {
    return [];
  }
}
