/**
 * TypeScript diagnostics collector
 * Runs tsc --noEmit and parses structured output
 */

import { exec } from '../exec.js';
import type { TypescriptData } from '../types.js';

export function collectTypescript(projectPath: string): TypescriptData {
  const result = exec(
    `cd ${projectPath} && npx tsc --noEmit --pretty false 2>&1`,
    60_000,
  );

  if (result.exitCode === 0) {
    return { success: true, diagnostics: [], errorCount: 0 };
  }

  const diagnostics = result.stdout
    .split('\n')
    .filter(Boolean)
    .map(parseTscLine)
    .filter((d): d is NonNullable<typeof d> => d !== null);

  return {
    success: false,
    diagnostics,
    errorCount: diagnostics.length,
  };
}

function parseTscLine(line: string) {
  const match = line.match(
    /^(.+?)\((\d+),\d+\):\s*error\s+TS(\d+):\s*(.+)$/
  );
  if (!match) return null;
  return {
    file: match[1],
    line: parseInt(match[2], 10),
    code: parseInt(match[3], 10),
    message: match[4],
  };
}
