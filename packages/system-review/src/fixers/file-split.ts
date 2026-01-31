/**
 * File-split fixer — calls Claude CLI to split oversized files (>200 lines)
 * Each file is split into <=200-line modules with a barrel re-export.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join, relative } from 'path';
import { tmpdir } from 'os';
import type { FixResult } from '../types.js';

const CLI_USER = 'elio';

const SPLIT_SYSTEM_PROMPT = `You are a TypeScript refactoring expert. Split the given file into smaller modules.

RULES:
1. Each output file must be ≤200 lines
2. The original file becomes a barrel that re-exports everything from new modules
3. Group related functions/types/classes into cohesive new files
4. New files go in the same directory with descriptive names
5. Do NOT change any function signatures, types, or behavior
6. All original exports must remain available from the original path
7. Return ONLY valid JSON, no markdown fences

RESPONSE FORMAT:
{
  "files": [
    { "path": "relative/path/to/file.ts", "content": "file content..." }
  ],
  "importsToUpdate": [
    { "file": "relative/path/consumer.ts", "oldImport": "from './original'", "newImport": "from './original'" }
  ]
}

The first file in "files" MUST be the original file path (now a barrel).
"importsToUpdate" is usually empty since the barrel preserves the original import path.`;

interface SplitOutput {
  files: Array<{ path: string; content: string }>;
  importsToUpdate: Array<{ file: string; oldImport: string; newImport: string }>;
}

function callCLI(prompt: string, systemPrompt: string, timeoutMs = 600_000): string | null {
  const fullPrompt = `${systemPrompt}\n\n${prompt}`;
  const tmpDir = mkdtempSync(join(tmpdir(), 'elio-llm-'));
  const promptFile = join(tmpDir, 'prompt.txt');
  writeFileSync(promptFile, fullPrompt, 'utf-8');

  try {
    const result = execSync(
      `sudo -u ${CLI_USER} claude --print --dangerously-skip-permissions < '${promptFile}'`,
      { encoding: 'utf-8', timeout: timeoutMs, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    return result.trim() || null;
  } catch {
    return null;
  } finally {
    try { execSync(`rm -rf '${tmpDir}'`); } catch { /* cleanup */ }
  }
}

function parseSplitResponse(raw: string): SplitOutput | null {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    const obj = JSON.parse(cleaned);
    if (!Array.isArray(obj.files) || obj.files.length === 0) return null;
    for (const f of obj.files) {
      if (typeof f.path !== 'string' || typeof f.content !== 'string') return null;
    }
    return obj as SplitOutput;
  } catch {
    return null;
  }
}

export async function splitSingleFile(
  filePath: string,
  basePath: string,
): Promise<{ success: boolean; output: string; filesCreated: string[] }> {
  if (filePath.includes('packages/system-review')) {
    return { success: false, output: `Skipped (protected): ${filePath}`, filesCreated: [] };
  }

  const fullPath = filePath.startsWith('/') ? filePath : join(basePath, filePath);
  if (!existsSync(fullPath)) {
    return { success: false, output: `File not found: ${filePath}`, filesCreated: [] };
  }

  const content = readFileSync(fullPath, 'utf-8');
  const lineCount = content.split('\n').length;
  if (lineCount <= 200) {
    return { success: true, output: `Already ≤200 lines (${lineCount})`, filesCreated: [] };
  }

  const relPath = relative(basePath, fullPath);
  const prompt = `## File: ${relPath} (${lineCount} lines)

\`\`\`typescript
${content}
\`\`\`

Split this file into modules of ≤200 lines each. The original file path must become a barrel re-export.`;

  const response = callCLI(prompt, SPLIT_SYSTEM_PROMPT);
  if (!response) return { success: false, output: 'CLI returned empty response', filesCreated: [] };

  const split = parseSplitResponse(response);
  if (!split) return { success: false, output: 'Could not parse split response', filesCreated: [] };

  const filesCreated: string[] = [];
  for (const file of split.files) {
    const outPath = join(basePath, file.path);
    const dir = dirname(outPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(outPath, file.content);
    filesCreated.push(file.path);
  }

  for (const upd of split.importsToUpdate ?? []) {
    const updPath = join(basePath, upd.file);
    if (!existsSync(updPath)) continue;
    let updContent = readFileSync(updPath, 'utf-8');
    if (updContent.includes(upd.oldImport)) {
      updContent = updContent.replace(upd.oldImport, upd.newImport);
      writeFileSync(updPath, updContent);
    }
  }

  return {
    success: true,
    output: `Split into ${split.files.length} files: ${filesCreated.join(', ')}`,
    filesCreated,
  };
}

export async function splitOversizedFiles(
  basePath: string,
  oversizedFiles: Array<{ path: string; lines: number }>,
  onProgress?: (file: string, status: string) => void,
): Promise<FixResult> {
  if (oversizedFiles.length === 0) {
    return { actionId: 'file-split', description: 'Split oversized files', success: true, output: 'No oversized files' };
  }

  const CONCURRENCY = 2;
  const results: Array<{ file: string; ok: boolean; msg: string }> = [];
  let idx = 0;

  async function processNext(): Promise<void> {
    while (idx < oversizedFiles.length) {
      const current = oversizedFiles[idx++];
      onProgress?.(current.path, 'splitting');
      try {
        const res = await splitSingleFile(current.path, basePath);
        results.push({ file: current.path, ok: res.success, msg: res.output });
        onProgress?.(current.path, res.success ? 'done' : 'failed');
      } catch (err) {
        results.push({ file: current.path, ok: false, msg: String(err) });
        onProgress?.(current.path, 'error');
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, oversizedFiles.length) }, () => processNext());
  await Promise.allSettled(workers);

  const succeeded = results.filter(r => r.ok).length;
  const output = results
    .map(r => `${r.ok ? '✅' : '❌'} ${r.file}: ${r.msg}`)
    .join('\n')
    .slice(0, 3000);

  return {
    actionId: 'file-split',
    description: `Split ${succeeded}/${oversizedFiles.length} oversized files`,
    success: succeeded > 0,
    output,
  };
}
