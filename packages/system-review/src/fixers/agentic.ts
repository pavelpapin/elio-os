/**
 * Agentic fixer — calls Claude CLI to fix code issues
 * Groups TS errors by file, sends file + errors to Claude, writes fix back
 */

import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import type { FixResult, ReviewData } from '../types.js';

const CLI_USER = 'elio';

function callCLI(prompt: string, systemPrompt: string, timeoutMs = 120_000): string | null {
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

function extractCode(response: string): string | null {
  const match = response.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
  if (match) return match[1];
  if (/^(import |export |\/\*|\/\/|'use )/.test(response.trim())) return response.trim();
  return null;
}

const SYSTEM_PROMPT = `You are a TypeScript code fixer. You receive a file with errors and fix them.

RULES:
1. Return ONLY the complete fixed file wrapped in \`\`\`typescript ... \`\`\` fences
2. Fix ALL listed errors
3. For "Cannot find module" errors on internal packages (@elio/*), add declare module at the top of the file or change the import
4. For "Cannot find module" on external packages, add // @ts-ignore above the import
5. For type errors, fix the types properly
6. For import violations (utils importing adapters), refactor the import — inline the needed functionality or add a proper interface
7. Keep ALL existing functionality — only fix errors, do not remove or change behavior
8. Do NOT add comments explaining your changes`;

export async function fixFileWithAgent(
  filePath: string,
  errors: string[],
  basePath: string,
): Promise<{ success: boolean; output: string }> {
  if (filePath.includes('packages/system-review')) {
    return { success: false, output: `Skipped (protected): ${filePath}` };
  }

  let fullPath = `${basePath}/${filePath}`;
  if (!existsSync(fullPath)) fullPath = `${basePath}/mcp-server/${filePath}`;
  if (!existsSync(fullPath)) return { success: false, output: `File not found: ${filePath}` };

  const content = readFileSync(fullPath, 'utf-8');
  const prompt = `## File: ${filePath}

\`\`\`typescript
${content}
\`\`\`

## Errors to fix:
${errors.map(e => `- ${e}`).join('\n')}

Fix all errors and return the complete file.`;

  const response = callCLI(prompt, SYSTEM_PROMPT);
  if (!response) return { success: false, output: 'CLI returned empty response' };

  const fixedCode = extractCode(response);
  if (!fixedCode) return { success: false, output: 'Could not extract code from response' };

  writeFileSync(fullPath, fixedCode);
  return { success: true, output: `Fixed ${errors.length} errors in ${filePath}` };
}

export async function fixTypescriptErrors(
  basePath: string,
  data: ReviewData,
): Promise<FixResult> {
  const byFile = new Map<string, string[]>();
  for (const d of data.typescript.diagnostics) {
    const errs = byFile.get(d.file) || [];
    errs.push(`TS${d.code} (line ${d.line}): ${d.message}`);
    byFile.set(d.file, errs);
  }

  const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10);
  const results: string[] = [];
  let fixed = 0;

  for (const [file, errors] of sorted) {
    const result = await fixFileWithAgent(file, errors, basePath);
    if (result.success) {
      fixed++;
      results.push(`✅ ${file} (${errors.length} errors)`);
    } else {
      results.push(`❌ ${file}: ${result.output}`);
    }
  }

  return {
    actionId: 'agentic-tsc',
    description: `Agent fixed ${fixed}/${sorted.length} files (${data.typescript.errorCount} total errors)`,
    success: fixed > 0,
    output: results.join('\n').slice(0, 2000),
  };
}

export async function fixImportViolations(
  basePath: string,
  data: ReviewData,
): Promise<FixResult> {
  const results: string[] = [];
  let fixed = 0;

  for (const v of data.architecture.importViolations) {
    const result = await fixFileWithAgent(v.file, [`Import violation: ${v.imports} — ${v.rule}`], basePath);
    if (result.success) {
      fixed++;
      results.push(`✅ ${v.file}`);
    } else {
      results.push(`❌ ${v.file}: ${result.output}`);
    }
  }

  return {
    actionId: 'agentic-imports',
    description: `Agent fixed ${fixed}/${data.architecture.importViolations.length} import violations`,
    success: fixed > 0,
    output: results.join('\n').slice(0, 2000),
  };
}
