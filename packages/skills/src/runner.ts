/**
 * Skill Runner Utilities
 * Common utilities for executing skills
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export const ROOT_DIR = '/root/.claude';

/**
 * Execute a shell command and return output
 */
export async function runCommand(
  command: string,
  options: { cwd?: string; timeout?: number } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { cwd = ROOT_DIR, timeout = 120000 } = options;

  try {
    const { stdout, stderr } = await execAsync(command, { cwd, timeout });
    return { stdout, stderr, exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || String(error),
      exitCode: execError.code || 1
    };
  }
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Read JSON file safely
 */
export function readJsonFile<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Get list of directories in a path
 */
export function listDirectories(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch {
    return [];
  }
}

/**
 * Get list of files matching pattern
 */
export function listFiles(dirPath: string, extension?: string): string[] {
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name);

    if (extension) {
      return files.filter(f => f.endsWith(extension));
    }
    return files;
  } catch {
    return [];
  }
}

/**
 * Make file executable
 */
export function makeExecutable(filePath: string): void {
  fs.chmodSync(filePath, 0o755);
}

/**
 * Write file with content
 */
export function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Delete file or directory
 */
export function remove(targetPath: string, recursive = false): boolean {
  try {
    if (recursive) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get directory size in bytes
 */
export async function getDirSize(dirPath: string): Promise<number> {
  const { stdout } = await runCommand(`du -sb "${dirPath}" | cut -f1`);
  return parseInt(stdout.trim(), 10) || 0;
}

/**
 * Get git changed files
 */
export async function getGitChangedFiles(cwd: string = ROOT_DIR): Promise<string[]> {
  const { stdout } = await runCommand('git diff --name-only HEAD~1 2>/dev/null || echo ""', { cwd });
  return stdout.trim().split('\n').filter(Boolean);
}
