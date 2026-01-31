/**
 * Build Error Diagnosis
 * Parses tsc/build output into structured errors for targeted self-healing
 */

export interface BuildError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}

export interface DiagnoseResult {
  errors: BuildError[];
  byFile: Map<string, BuildError[]>;
  summary: string;
}

/**
 * Parse TypeScript compiler output into structured errors.
 * Handles formats:
 *   src/foo.ts(10,5): error TS2345: Argument of type...
 *   src/foo.ts:10:5 - error TS2345: Argument of type...
 */
export function parseBuildErrors(buildOutput: string): DiagnoseResult {
  const errors: BuildError[] = [];

  const lines = buildOutput.split('\n');
  for (const line of lines) {
    const parsed = parseTscLine(line);
    if (parsed) errors.push(parsed);
  }

  const byFile = new Map<string, BuildError[]>();
  for (const err of errors) {
    const existing = byFile.get(err.file) ?? [];
    existing.push(err);
    byFile.set(err.file, existing);
  }

  const fileCount = byFile.size;
  const summary = `${errors.length} errors in ${fileCount} files`;

  return { errors, byFile, summary };
}

function parseTscLine(line: string): BuildError | null {
  // Format: src/foo.ts(10,5): error TS2345: message
  const m1 = line.match(/^(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)/);
  if (m1) {
    return {
      file: m1[1],
      line: parseInt(m1[2], 10),
      column: parseInt(m1[3], 10),
      code: m1[4],
      message: m1[5],
    };
  }

  // Format: src/foo.ts:10:5 - error TS2345: message
  const m2 = line.match(/^(.+?):(\d+):(\d+)\s*-\s*error\s+(TS\d+):\s*(.+)/);
  if (m2) {
    return {
      file: m2[1],
      line: parseInt(m2[2], 10),
      column: parseInt(m2[3], 10),
      code: m2[4],
      message: m2[5],
    };
  }

  return null;
}
