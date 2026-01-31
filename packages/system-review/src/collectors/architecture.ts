/**
 * Architecture collector — deep structural analysis
 * File sizes, function lengths, circular deps, orphans, import violations, unused deps
 */

import { exec } from '../exec.js';
import type { ArchitectureData } from '../types.js';
import {
  findOversizedFiles,
  findLongFunctions,
  countTsFiles,
  findCircularDeps,
  findOrphanFiles,
  findImportViolations,
  findUnusedDeps,
} from './architecture-checks.js';

const EXCLUDE = '--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git';

export function collectArchitecture(projectPath: string): ArchitectureData {
  return {
    oversizedFiles: findOversizedFiles(projectPath),
    longFunctions: findLongFunctions(projectPath),
    totalFiles: countTsFiles(projectPath),
    circularDeps: findCircularDeps(projectPath),
    orphanFiles: findOrphanFiles(projectPath),
    importViolations: findImportViolations(projectPath),
    unusedDeps: findUnusedDeps(projectPath),
    unusedExports: countUnusedExports(projectPath),
    patternInconsistencies: checkPatternConsistency(projectPath),
    moduleCoupling: measureModuleCoupling(projectPath),
  };
}

/**
 * Count exports not used anywhere else in the project
 */
function countUnusedExports(basePath: string): number {
  const srcPath = `${basePath}/mcp-server/src`;
  const exportsResult = exec(
    `grep -rn "^export " ${srcPath} --include="*.ts" ${EXCLUDE} 2>/dev/null | wc -l`,
  );
  const totalExports = parseInt(exportsResult.stdout, 10) || 0;

  const usedResult = exec(
    `grep -roh "import.*from" ${srcPath} --include="*.ts" ${EXCLUDE} 2>/dev/null | wc -l`,
  );
  const totalImports = parseInt(usedResult.stdout, 10) || 0;

  const ratio = totalExports > 0 ? totalImports / totalExports : 1;
  if (ratio < 0.5) return Math.round(totalExports * (1 - ratio));
  return 0;
}

/**
 * Pattern consistency — do adapters follow the same structure?
 */
function checkPatternConsistency(basePath: string): Array<{ module: string; issue: string }> {
  const issues: Array<{ module: string; issue: string }> = [];
  const adapterDir = `${basePath}/mcp-server/src/adapters`;

  const adapters = exec(`ls -d ${adapterDir}/*/ 2>/dev/null`);
  if (!adapters.stdout) return [];

  for (const dir of adapters.stdout.split('\n').filter(Boolean)) {
    const name = dir.replace(/\/$/, '').split('/').pop();
    if (!name) continue;

    const hasIndex = exec(`test -f "${dir}index.ts" && echo "yes"`).stdout.includes('yes');
    if (!hasIndex) {
      issues.push({ module: `adapter:${name}`, issue: 'Missing index.ts entry point' });
    }
  }

  // Check packages have consistent structure
  const pkgDir = `${basePath}/packages`;
  const packages = exec(`ls -d ${pkgDir}/*/ 2>/dev/null | grep -v node_modules | grep -v shared`);
  for (const dir of (packages.stdout || '').split('\n').filter(Boolean)) {
    const name = dir.replace(/\/$/, '').split('/').pop();
    if (!name) continue;

    const hasSrc = exec(`test -d "${dir}src" && echo "yes"`).stdout.includes('yes');
    if (!hasSrc) {
      issues.push({ module: `package:${name}`, issue: 'Missing src/ directory' });
    }
  }

  return issues.slice(0, 20);
}

/**
 * Module coupling — fan-in (how many import this) / fan-out (how many this imports)
 */
function measureModuleCoupling(basePath: string): Array<{ module: string; fanIn: number; fanOut: number }> {
  const srcPath = `${basePath}/mcp-server/src`;
  const modules = exec(`ls -d ${srcPath}/adapters/*/ ${srcPath}/db/ ${srcPath}/utils/ 2>/dev/null`);
  if (!modules.stdout) return [];

  const results: Array<{ module: string; fanIn: number; fanOut: number }> = [];

  for (const dir of modules.stdout.split('\n').filter(Boolean)) {
    const name = dir.replace(srcPath + '/', '').replace(/\/$/, '');

    // Fan-out: how many external modules this imports
    const fanOutResult = exec(
      `grep -rh "from ['\"]" ${dir} --include="*.ts" ${EXCLUDE} 2>/dev/null | grep -v "from ['\"]\\." | wc -l`,
    );
    const fanOut = parseInt(fanOutResult.stdout, 10) || 0;

    // Fan-in: how many files outside this module import from it
    const moduleName = name.split('/').pop() ?? name;
    const fanInResult = exec(
      `grep -rl "${moduleName}" ${srcPath} --include="*.ts" ${EXCLUDE} 2>/dev/null | grep -v "${dir}" | wc -l`,
    );
    const fanIn = parseInt(fanInResult.stdout, 10) || 0;

    results.push({ module: name, fanIn, fanOut });
  }

  return results.sort((a, b) => (b.fanIn + b.fanOut) - (a.fanIn + a.fanOut)).slice(0, 20);
}
