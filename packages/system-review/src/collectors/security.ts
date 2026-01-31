/**
 * Security data collector
 * npm audit + secret pattern scanning
 */

import { exec } from '../exec.js';
import type { SecurityData } from '../types.js';

export function collectSecurity(projectPath: string): SecurityData {
  const basePath = projectPath.replace(/\/mcp-server$/, '');
  return {
    npmAudit: runNpmAudit(projectPath),
    secretsFound: scanSecrets(projectPath),
    ...checkNodeVersion(),
    secretsWorldReadable: checkSecretsPermissions(basePath),
  };
}

function runNpmAudit(path: string): SecurityData['npmAudit'] {
  const empty = {
    total: 0, critical: 0, high: 0, moderate: 0, low: 0,
    vulnerabilities: [],
  };

  const result = exec(`cd ${path} && pnpm audit --json 2>/dev/null`, 60_000);
  if (!result.stdout) return empty;

  try {
    const audit = JSON.parse(result.stdout);
    const meta = audit.metadata?.vulnerabilities ?? {};
    const vulns = audit.advisories ?? audit.vulnerabilities ?? {};

    const vulnerabilities = Object.values(vulns).map((v: unknown) => {
      const entry = v as Record<string, unknown>;
      return {
        name: String(entry.module_name ?? entry.name ?? 'unknown'),
        severity: String(entry.severity ?? 'low'),
        title: String(entry.title ?? entry.name ?? ''),
        url: entry.url ? String(entry.url) : undefined,
        fixAvailable: Boolean(entry.fixAvailable ?? entry.patched_versions),
      };
    });

    return {
      total: (meta.total ?? vulnerabilities.length) as number,
      critical: (meta.critical ?? 0) as number,
      high: (meta.high ?? 0) as number,
      moderate: (meta.moderate ?? 0) as number,
      low: (meta.low ?? 0) as number,
      vulnerabilities,
    };
  } catch {
    return empty;
  }
}

const SECRET_PATTERNS = [
  { name: 'AWS Key', regex: 'AKIA[0-9A-Z]{16}' },
  { name: 'Generic Secret', regex: '(?:password|secret|token|api_key)\\s*[:=]\\s*["\'][^"\']{8,}' },
  { name: 'Private Key', regex: '-----BEGIN (?:RSA |EC )?PRIVATE KEY-----' },
  { name: 'JWT', regex: 'eyJ[a-zA-Z0-9_-]{10,}\\.[a-zA-Z0-9_-]{10,}\\.' },
];

function scanSecrets(path: string): SecurityData['secretsFound'] {
  const findings: SecurityData['secretsFound'] = [];

  for (const pattern of SECRET_PATTERNS) {
    const result = exec(
      `grep -rn "${pattern.regex}" ${path} --include="*.ts" --include="*.js" --include="*.json" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=secrets 2>/dev/null | head -20`,
    );
    if (!result.stdout) continue;

    for (const line of result.stdout.split('\n').filter(Boolean)) {
      const match = line.match(/^(.+?):(\d+):/);
      if (match) {
        findings.push({
          file: match[1],
          line: parseInt(match[2], 10),
          pattern: pattern.name,
        });
      }
    }
  }

  return findings;
}

function checkNodeVersion(): { nodeVersionOutdated: boolean; nodeVersion: string } {
  const result = exec('node --version 2>/dev/null');
  const version = result.stdout.replace('v', '').trim();
  if (!version) return { nodeVersionOutdated: false, nodeVersion: 'unknown' };

  const major = parseInt(version.split('.')[0], 10);
  // Node 22+ is current LTS as of 2026
  return { nodeVersionOutdated: major < 22, nodeVersion: version };
}

function checkSecretsPermissions(basePath: string): string[] {
  const result = exec(
    `find ${basePath}/secrets -type f -perm /o+r 2>/dev/null`,
  );
  if (!result.stdout) return [];

  return result.stdout.split('\n').filter(Boolean).map(
    p => p.replace(basePath + '/', ''),
  );
}
