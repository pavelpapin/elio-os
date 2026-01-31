/**
 * Architecture check functions — individual analysis operations
 * File sizes, function lengths, circular deps, orphans, import violations, unused deps
 */

import { exec } from '../exec.js';
import { normalize, resolveImport, detectCycle } from './architecture-utils.js';

const EXCLUDE = '--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git';
const TS_FIND = '-name "*.ts" -not -path "*/node_modules/*" -not -path "*/dist/*"';

export function findOversizedFiles(path: string) {
  const result = exec(
    `find ${path} ${TS_FIND} -exec wc -l {} + 2>/dev/null | sort -rn | head -50`,
  );
  if (!result.stdout) return [];

  return result.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const match = line.trim().match(/^(\d+)\s+(.+)$/);
      if (!match) return null;
      const lines = parseInt(match[1], 10);
      if (lines <= 200 || match[2] === 'total') return null;
      return { path: match[2], lines };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);
}

export function findLongFunctions(path: string) {
  const result = exec(
    `grep -rn "^\\(export \\)\\?\\(async \\)\\?function " ${path} --include="*.ts" ${EXCLUDE} 2>/dev/null | head -200`,
  );
  if (!result.stdout) return [];

  const longFns: Array<{ file: string; functionName: string; lines: number }> = [];

  for (const line of result.stdout.split('\n').filter(Boolean)) {
    const match = line.match(/^(.+?):(\d+):.*(function\s+(\w+))/);
    if (!match) continue;
    const [, file, lineStr, , fnName] = match;
    const startLine = parseInt(lineStr, 10);

    const lengthResult = exec(
      `awk 'NR>=${startLine}{if(/^[}]$/){print NR-${startLine}+1; exit}}' "${file}" 2>/dev/null`,
    );
    const fnLength = parseInt(lengthResult.stdout, 10) || 0;
    if (fnLength > 50) {
      longFns.push({ file, functionName: fnName, lines: fnLength });
    }
  }

  return longFns;
}

export function countTsFiles(path: string): number {
  const result = exec(`find ${path} ${TS_FIND} | wc -l`);
  return parseInt(result.stdout, 10) || 0;
}

/**
 * Circular dependencies — find A→B→A import cycles
 * Uses grep to build import graph, then detect cycles
 */
export function findCircularDeps(path: string) {
  const result = exec(
    `grep -rn "from ['\"]\\./\\|from ['\"]\\.\\./" ${path}/mcp-server/src --include="*.ts" ${EXCLUDE} 2>/dev/null | head -500`,
  );
  if (!result.stdout) return [];

  const imports = new Map<string, string[]>();

  for (const line of result.stdout.split('\n').filter(Boolean)) {
    const match = line.match(/^(.+?\.ts):\d+:.*from\s+['"](\.[^'"]+)['"]/);
    if (!match) continue;
    const fromFile = normalize(match[1]);
    const toFile = resolveImport(match[1], match[2]);
    if (!imports.has(fromFile)) imports.set(fromFile, []);
    imports.get(fromFile)!.push(toFile);
  }

  const cycles: Array<{ cycle: string[] }> = [];
  const visited = new Set<string>();

  for (const file of Array.from(imports.keys())) {
    if (visited.has(file)) continue;
    const path: string[] = [];
    detectCycle(file, imports, visited, path, cycles);
  }

  return cycles.slice(0, 20);
}

/**
 * Orphan files — .ts files not imported by anyone
 */
export function findOrphanFiles(basePath: string) {
  const srcPath = `${basePath}/mcp-server/src`;

  const allFiles = exec(
    `find ${srcPath} ${TS_FIND} -not -name "*.test.ts" -not -name "*.d.ts" | head -300`,
  );
  if (!allFiles.stdout) return [];

  const files = allFiles.stdout.split('\n').filter(Boolean);
  const orphans: string[] = [];

  for (const file of files) {
    const basename = file.replace(/\.ts$/, '').split('/').pop();
    if (!basename || basename === 'index') continue;

    const grepResult = exec(
      `grep -rl "from.*${basename}" ${srcPath} --include="*.ts" ${EXCLUDE} 2>/dev/null | head -1`,
    );
    if (!grepResult.stdout) {
      orphans.push(file.replace(`${basePath}/`, ''));
    }
  }

  return orphans.slice(0, 30);
}

/**
 * Import violations — enforce dependency direction rules
 * adapters/ should NOT import from other adapters/
 * utils/ should NOT import from adapters/ or services/
 */
export function findImportViolations(basePath: string) {
  const srcPath = `${basePath}/mcp-server/src`;
  const violations: Array<{ file: string; imports: string; rule: string }> = [];

  // Rule 1: adapter importing another adapter
  const adapterCross = exec(
    `grep -rn "from.*adapters/" ${srcPath}/adapters --include="*.ts" ${EXCLUDE} 2>/dev/null | grep -v "from.*adapters/.*index" | head -30`,
  );
  for (const line of (adapterCross.stdout || '').split('\n').filter(Boolean)) {
    const match = line.match(/^(.+?\.ts):\d+:.*from\s+['"]([^'"]+)['"]/);
    if (!match) continue;
    const fromAdapter = match[1].match(/adapters\/([^/]+)/)?.[1];
    const toAdapter = match[2].match(/adapters\/([^/]+)/)?.[1];
    if (fromAdapter && toAdapter && fromAdapter !== toAdapter) {
      violations.push({
        file: match[1].replace(`${basePath}/`, ''),
        imports: match[2],
        rule: `adapter "${fromAdapter}" imports from adapter "${toAdapter}" — use gateway`,
      });
    }
  }

  // Rule 2: utils importing from adapters or services
  const utilViolation = exec(
    `grep -rn "from.*\\(adapters\\|services\\)/" ${srcPath}/utils --include="*.ts" ${EXCLUDE} 2>/dev/null | head -20`,
  );
  for (const line of (utilViolation.stdout || '').split('\n').filter(Boolean)) {
    const match = line.match(/^(.+?\.ts):\d+:.*from\s+['"]([^'"]+)['"]/);
    if (match) {
      violations.push({
        file: match[1].replace(`${basePath}/`, ''),
        imports: match[2],
        rule: 'utils should not import from adapters or services',
      });
    }
  }

  return violations.slice(0, 20);
}

/**
 * Unused dependencies in package.json
 */
export function findUnusedDeps(basePath: string) {
  const pkgPath = `${basePath}/mcp-server/package.json`;
  const pkgResult = exec(`cat ${pkgPath} 2>/dev/null`);
  if (!pkgResult.stdout) return [];

  try {
    const pkg = JSON.parse(pkgResult.stdout);
    const deps = Object.keys(pkg.dependencies ?? {});
    const unused: string[] = [];

    for (const dep of deps) {
      if (dep.startsWith('@types/')) continue;
      const grepResult = exec(
        `grep -rl "${dep}" ${basePath}/mcp-server/src --include="*.ts" ${EXCLUDE} 2>/dev/null | head -1`,
      );
      if (!grepResult.stdout) unused.push(dep);
    }

    return unused;
  } catch {
    return [];
  }
}
