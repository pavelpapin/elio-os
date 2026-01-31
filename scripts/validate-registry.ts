#!/usr/bin/env npx tsx
/**
 * Registry Validator
 * Checks that registry.yaml matches actual filesystem state.
 * Run: npx tsx scripts/validate-registry.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ROOT = '/root/.claude';
const REGISTRY_PATH = join(ROOT, 'registry.yaml');

interface Issue {
  severity: 'error' | 'warn';
  category: string;
  message: string;
}

const issues: Issue[] = [];

function error(category: string, message: string) {
  issues.push({ severity: 'error', category, message });
}

function warn(category: string, message: string) {
  issues.push({ severity: 'warn', category, message });
}

function checkPath(label: string, relativePath: string): boolean {
  const full = join(ROOT, relativePath);
  if (!existsSync(full)) {
    error('missing-path', `${label}: ${relativePath} does not exist`);
    return false;
  }
  return true;
}

// Parse registry.yaml (simple parser — enough for validation)
const registryContent = readFileSync(REGISTRY_PATH, 'utf-8');

// Check workspace packages vs registry
const workspaceContent = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf-8');

// Find all actual package.json files
const packageJsons = execSync(
  'find /root/.claude -maxdepth 3 -name package.json -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.next/*"',
  { encoding: 'utf-8' }
).trim().split('\n').filter(Boolean);

// Check each package.json is mentioned in registry
const registryLower = registryContent.toLowerCase();
for (const pj of packageJsons) {
  const rel = pj.replace('/root/.claude/', '');
  if (rel === 'package.json') continue; // root package.json
  if (rel === 'scripts/package.json') continue; // scripts helper
  if (rel.includes('website/')) continue; // website is separate

  const dir = rel.replace('/package.json', '');

  // Check if this directory is mentioned anywhere in registry
  if (!registryContent.includes(dir)) {
    const pkg = JSON.parse(readFileSync(pj, 'utf-8'));
    const name = pkg.name || 'unknown';
    warn('unregistered', `Package "${name}" at ${dir} is not in registry.yaml`);
  }
}

// Check paths referenced in registry exist
const pathPattern = /(?:path|code|docs|script|adapter|mcp_adapter|package):\s*((?:packages|mcp-server|workflows|skills|apps|elio|gtd|headless|context-graph|self-improvement|scheduler)[^\s#]*)/g;
let match;
while ((match = pathPattern.exec(registryContent)) !== null) {
  const value = match[1].trim().replace(/["']/g, '');
  if (value.startsWith('#') || value.startsWith('[')) continue;
  checkPath('registry reference', value);
}

// Check for duplicate package names in workspace
const names = new Map<string, string>();
for (const pj of packageJsons) {
  try {
    const pkg = JSON.parse(readFileSync(pj, 'utf-8'));
    if (pkg.name && names.has(pkg.name)) {
      error('duplicate-name', `Package name "${pkg.name}" used in both ${names.get(pkg.name)} and ${pj.replace('/root/.claude/', '')}`);
    }
    if (pkg.name) {
      names.set(pkg.name, pj.replace('/root/.claude/', ''));
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// Code Standards Checks
// ---------------------------------------------------------------------------

const MAX_LINES = 200;
const SRC_DIRS = ['packages', 'apps', 'elio', 'gtd', 'headless', 'context-graph', 'self-improvement', 'scheduler'];

function findTsFiles(): string[] {
  const dirs = SRC_DIRS.map(d => join(ROOT, d)).filter(d => existsSync(d));
  if (dirs.length === 0) return [];
  const cmd = `find ${dirs.join(' ')} -name '*.ts' -not -path '*/node_modules/*' -not -path '*/dist/*' -not -name '*.d.ts' -not -name '*.test.ts' -not -name '*.spec.ts'`;
  return execSync(cmd, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
}

const tsFiles = findTsFiles();

// Check 1: File size > 200 lines
const oversizedFiles: { file: string; lines: number }[] = [];
for (const f of tsFiles) {
  const content = readFileSync(f, 'utf-8');
  const lineCount = content.split('\n').length;
  if (lineCount > MAX_LINES) {
    oversizedFiles.push({ file: f.replace(ROOT + '/', ''), lines: lineCount });
  }
}
if (oversizedFiles.length > 0) {
  warn('file-size', `${oversizedFiles.length} files exceed ${MAX_LINES}-line limit`);
  for (const f of oversizedFiles.slice(0, 10)) {
    warn('file-size', `  ${f.file} (${f.lines} lines)`);
  }
  if (oversizedFiles.length > 10) {
    warn('file-size', `  ... and ${oversizedFiles.length - 10} more`);
  }
}

// Check 2: console.log in production code (excluding index.ts bootstrap files)
const consoleFiles: string[] = [];
for (const f of tsFiles) {
  const rel = f.replace(ROOT + '/', '');
  if (rel.endsWith('/index.ts') && rel.startsWith('apps/')) continue; // bootstrap OK
  if (rel === 'packages/shared/src/logger.ts') continue; // logger implementation uses console
  const content = readFileSync(f, 'utf-8');
  if (/console\.(log|warn|error)\(/.test(content)) {
    consoleFiles.push(rel);
  }
}
if (consoleFiles.length > 0) {
  error('console-log', `${consoleFiles.length} files use console.log/warn/error (use createLogger)`);
  for (const f of consoleFiles.slice(0, 5)) {
    warn('console-log', `  ${f}`);
  }
  if (consoleFiles.length > 5) {
    warn('console-log', `  ... and ${consoleFiles.length - 5} more`);
  }
}

// Check 3: export default
const defaultExportFiles: string[] = [];
for (const f of tsFiles) {
  const content = readFileSync(f, 'utf-8');
  if (/^export default /m.test(content)) {
    defaultExportFiles.push(f.replace(ROOT + '/', ''));
  }
}
if (defaultExportFiles.length > 0) {
  warn('export-default', `${defaultExportFiles.length} files use export default (use named exports)`);
  for (const f of defaultExportFiles.slice(0, 5)) {
    warn('export-default', `  ${f}`);
  }
  if (defaultExportFiles.length > 5) {
    warn('export-default', `  ... and ${defaultExportFiles.length - 5} more`);
  }
}

// Check 4: any type usage
const anyTypeFiles: string[] = [];
for (const f of tsFiles) {
  const content = readFileSync(f, 'utf-8');
  // Match `: any`, `as any`, `<any>` but not inside comments or strings
  if (/:\s*any\b|as\s+any\b|<any>/m.test(content)) {
    anyTypeFiles.push(f.replace(ROOT + '/', ''));
  }
}
if (anyTypeFiles.length > 0) {
  warn('any-type', `${anyTypeFiles.length} files use 'any' type (use unknown + type guards)`);
  for (const f of anyTypeFiles.slice(0, 5)) {
    warn('any-type', `  ${f}`);
  }
  if (anyTypeFiles.length > 5) {
    warn('any-type', `  ... and ${anyTypeFiles.length - 5} more`);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('\n=== Registry & Standards Validation Report ===\n');

const errors = issues.filter(i => i.severity === 'error');
const warnings = issues.filter(i => i.severity === 'warn');

if (errors.length > 0) {
  console.log(`❌ ERRORS (${errors.length}):`);
  for (const e of errors) {
    console.log(`  [${e.category}] ${e.message}`);
  }
  console.log();
}

if (warnings.length > 0) {
  console.log(`⚠️  WARNINGS (${warnings.length}):`);
  for (const w of warnings) {
    console.log(`  [${w.category}] ${w.message}`);
  }
  console.log();
}

// Summary stats
const stats = {
  oversized: oversizedFiles.length,
  consoleLogs: consoleFiles.length,
  defaultExports: defaultExportFiles.length,
  anyTypes: anyTypeFiles.length,
};

console.log('--- Standards Summary ---');
console.log(`  Files > ${MAX_LINES} lines:  ${stats.oversized === 0 ? '✅ 0' : `❌ ${stats.oversized}`}`);
console.log(`  console.log usage:   ${stats.consoleLogs === 0 ? '✅ 0' : `⚠️  ${stats.consoleLogs}`}`);
console.log(`  export default:      ${stats.defaultExports === 0 ? '✅ 0' : `⚠️  ${stats.defaultExports}`}`);
console.log(`  any type usage:      ${stats.anyTypes === 0 ? '✅ 0' : `⚠️  ${stats.anyTypes}`}`);
console.log();

if (issues.length === 0) {
  console.log('✅ All checks passed!\n');
}

console.log(`Summary: ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length > 0 ? 1 : 0);
