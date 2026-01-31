/**
 * Brutal Audit - Check Functions
 */

import { ROOT_DIR, runCommand, listDirectories, fileExists, readJsonFile } from '../runner.js';
import * as path from 'path';
import * as fs from 'fs';
import type { AuditIssue } from './index.js';

export async function checkHardcodedSecrets(): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  const patterns = [
    'api[_-]?key\\s*[:=]\\s*["\'][^"\']+["\']',
    'secret\\s*[:=]\\s*["\'][^"\']+["\']',
    'password\\s*[:=]\\s*["\'][^"\']+["\']',
    'token\\s*[:=]\\s*["\'][^"\']+["\']'
  ];

  for (const pattern of patterns) {
    const { stdout } = await runCommand(
      `grep -rniE "${pattern}" "${ROOT_DIR}/packages" "${ROOT_DIR}/mcp-server/src" 2>/dev/null | grep -v node_modules | grep -v ".test." | grep -v "mock" | head -10 || true`
    );

    const matches = stdout.trim().split('\n').filter(Boolean);
    for (const match of matches) {
      if (match.includes('process.env') || match.includes('readFile') || match.includes('getCredentials')) continue;

      issues.push({
        severity: 'P0',
        category: 'security',
        issue: 'Potential hardcoded secret',
        location: match.split(':')[0],
        recommendation: 'Move credentials to secrets/ directory'
      });
    }
  }

  return issues;
}

export async function checkArchitecture(): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  const adaptersDir = path.join(ROOT_DIR, 'mcp-server/src/adapters');
  const clientsDir = path.join(ROOT_DIR, 'packages/clients/src');

  const adapters = listDirectories(adaptersDir);
  const clients = listDirectories(clientsDir).filter(c => c !== 'utils');

  for (const client of clients) {
    const hasAdapter = adapters.some(a =>
      a === client || a.includes(client) || client.includes(a)
    );

    if (!hasAdapter) {
      issues.push({
        severity: 'P1',
        category: 'architecture',
        issue: `Client without adapter: ${client}`,
        location: `packages/clients/src/${client}`,
        recommendation: 'Create MCP adapter or remove unused client'
      });
    }
  }

  for (const adapter of adapters) {
    const indexPath = path.join(adaptersDir, adapter, 'index.ts');
    if (!fileExists(indexPath)) continue;

    const content = fs.readFileSync(indexPath, 'utf-8');

    if (content.includes('fetch(') && !content.includes('@elio/clients')) {
      issues.push({
        severity: 'P1',
        category: 'architecture',
        issue: `Adapter ${adapter} makes direct API calls`,
        location: indexPath,
        recommendation: 'Move API logic to @elio/clients'
      });
    }
  }

  return issues;
}

export async function checkCodeQuality(): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  const { stdout: anyTypes } = await runCommand(
    `grep -rn ": any" "${ROOT_DIR}/packages" "${ROOT_DIR}/mcp-server/src" 2>/dev/null | grep -v node_modules | grep -v ".d.ts" | wc -l`
  );

  const anyCount = parseInt(anyTypes.trim(), 10);
  if (anyCount > 10) {
    issues.push({
      severity: 'P2',
      category: 'quality',
      issue: `${anyCount} usages of 'any' type found`,
      recommendation: 'Replace with proper types'
    });
  }

  const { stdout: consoleLogs } = await runCommand(
    `grep -rn "console\\.log" "${ROOT_DIR}/packages" "${ROOT_DIR}/mcp-server/src" 2>/dev/null | grep -v node_modules | grep -v ".test." | grep -v "logger" | wc -l`
  );

  const logCount = parseInt(consoleLogs.trim(), 10);
  if (logCount > 5) {
    issues.push({
      severity: 'P3',
      category: 'quality',
      issue: `${logCount} console.log statements in production code`,
      recommendation: 'Use createLogger from @elio/shared'
    });
  }

  const { stdout: todos } = await runCommand(
    `grep -rniE "TODO|FIXME|HACK|XXX" "${ROOT_DIR}/packages" "${ROOT_DIR}/mcp-server/src" 2>/dev/null | grep -v node_modules | wc -l`
  );

  const todoCount = parseInt(todos.trim(), 10);
  if (todoCount > 20) {
    issues.push({
      severity: 'P3',
      category: 'quality',
      issue: `${todoCount} TODO/FIXME comments found`,
      recommendation: 'Address or track in backlog'
    });
  }

  return issues;
}

export async function checkVersionConsistency(): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  const packages = listDirectories(path.join(ROOT_DIR, 'packages'));
  const versions = new Map<string, string[]>();

  for (const pkg of packages) {
    const pkgJson = readJsonFile<{ version?: string }>(
      path.join(ROOT_DIR, 'packages', pkg, 'package.json')
    );
    if (pkgJson?.version) {
      const v = pkgJson.version;
      if (!versions.has(v)) versions.set(v, []);
      versions.get(v)!.push(pkg);
    }
  }

  if (versions.size > 1) {
    const versionList = Array.from(versions.entries())
      .map(([v, pkgs]) => `${v}: ${pkgs.join(', ')}`)
      .join('; ');
    issues.push({
      severity: 'P2',
      category: 'consistency',
      issue: `Inconsistent package versions: ${versionList}`,
      recommendation: 'Unify all package versions'
    });
  }

  return issues;
}
