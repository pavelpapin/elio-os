/**
 * Safe shell execution helper
 */

import { execSync } from 'child_process';

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function exec(cmd: string, timeoutMs = 30_000): ExecResult {
  try {
    const stdout = execSync(cmd, {
      encoding: 'utf-8',
      timeout: timeoutMs,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return { stdout, stderr: '', exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: (e.stdout ?? '').toString().trim(),
      stderr: (e.stderr ?? '').toString().trim(),
      exitCode: e.status ?? 1,
    };
  }
}
