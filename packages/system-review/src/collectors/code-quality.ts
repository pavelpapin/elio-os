/**
 * Code quality collector
 * Duplicates, complexity, TODOs, `any` types, console.logs
 */

import { exec } from '../exec.js';
import type { CodeQualityData } from '../types.js';

const EXCLUDE = '--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git';

export function collectCodeQuality(basePath: string): CodeQualityData {
  const srcPath = `${basePath}/mcp-server/src`;
  const pkgPath = `${basePath}/packages`;

  return {
    duplicatePercent: estimateDuplication(srcPath, pkgPath),
    highComplexityFunctions: findHighComplexity(srcPath, pkgPath),
    todoCount: countTodos(basePath).count,
    todos: countTodos(basePath).items,
    anyTypeCount: countAnyTypes(srcPath, pkgPath),
    consoleLogCount: countConsoleLogs(srcPath, pkgPath),
  };
}

function estimateDuplication(srcPath: string, pkgPath: string): number {
  // Hash-based duplicate detection: normalize lines, group by hash
  const result = exec(
    `find ${srcPath} ${pkgPath} -name "*.ts" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -name "*.test.ts" -not -name "*.d.ts" 2>/dev/null | head -200`,
  );
  if (!result.stdout) return 0;

  const files = result.stdout.split('\n').filter(Boolean);
  let totalLines = 0;
  let duplicateLines = 0;
  const lineHashes = new Map<string, number>();

  for (const file of files) {
    const content = exec(`cat "${file}" 2>/dev/null`);
    if (!content.stdout) continue;
    const lines = content.stdout.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 20 && !l.startsWith('//') && !l.startsWith('import') && !l.startsWith('export {'));

    totalLines += lines.length;
    for (const line of lines) {
      const count = lineHashes.get(line) ?? 0;
      if (count > 0) duplicateLines++;
      lineHashes.set(line, count + 1);
    }
  }

  return totalLines > 0 ? Math.round((duplicateLines / totalLines) * 100) : 0;
}

function findHighComplexity(srcPath: string, pkgPath: string): CodeQualityData['highComplexityFunctions'] {
  // Heuristic: count branching keywords per function
  const result = exec(
    `grep -rn "^\\(export \\)\\?\\(async \\)\\?function " ${srcPath} ${pkgPath} --include="*.ts" ${EXCLUDE} 2>/dev/null | head -200`,
  );
  if (!result.stdout) return [];

  const complex: CodeQualityData['highComplexityFunctions'] = [];

  for (const line of result.stdout.split('\n').filter(Boolean)) {
    const match = line.match(/^(.+?):(\d+):.*(function\s+(\w+))/);
    if (!match) continue;
    const [, file, lineStr, , fnName] = match;
    const startLine = parseInt(lineStr, 10);

    // Extract function body (up to 200 lines)
    const bodyResult = exec(
      `awk 'NR>=${startLine} && NR<=${startLine + 200}' "${file}" 2>/dev/null`,
    );
    if (!bodyResult.stdout) continue;

    // Count branching: if, else, for, while, switch, case, &&, ||, ?:, catch
    const branches = (bodyResult.stdout.match(/\b(if|else|for|while|switch|case|catch)\b|&&|\|\||\?(?!:)/g) ?? []).length;
    // Cyclomatic complexity ≈ branches + 1
    const complexity = branches + 1;

    if (complexity > 15) {
      complex.push({ file: file.replace(/.*\/\.claude\//, ''), functionName: fnName, complexity });
    }
  }

  return complex.slice(0, 30);
}

function countTodos(basePath: string): { count: number; items: CodeQualityData['todos'] } {
  const result = exec(
    `grep -rn "\\(TODO\\|FIXME\\|HACK\\|XXX\\)" ${basePath}/mcp-server/src ${basePath}/packages --include="*.ts" ${EXCLUDE} 2>/dev/null | head -100`,
  );
  if (!result.stdout) return { count: 0, items: [] };

  const lines = result.stdout.split('\n').filter(Boolean);
  const items = lines.slice(0, 30).map(line => {
    const match = line.match(/^(.+?):(\d+):(.*)$/);
    return match ? {
      file: match[1].replace(/.*\/\.claude\//, ''),
      line: parseInt(match[2], 10),
      text: match[3].trim().slice(0, 100),
    } : null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  return { count: lines.length, items };
}

function countAnyTypes(srcPath: string, pkgPath: string): number {
  const result = exec(
    `grep -rn ": any\\b\\|as any\\b\\|<any>" ${srcPath} ${pkgPath} --include="*.ts" ${EXCLUDE} 2>/dev/null | grep -v "*.test.ts" | wc -l`,
  );
  return parseInt(result.stdout, 10) || 0;
}

function countConsoleLogs(srcPath: string, pkgPath: string): number {
  const result = exec(
    `grep -rn "console\\.log\\b" ${srcPath} ${pkgPath} --include="*.ts" ${EXCLUDE} 2>/dev/null | grep -v "*.test.ts" | wc -l`,
  );
  return parseInt(result.stdout, 10) || 0;
}
