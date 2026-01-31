/**
 * Auto-Test - Individual Test Runner Functions
 */

import * as path from 'path';
import { ROOT_DIR, runCommand, fileExists, listDirectories } from '../runner.js';

interface TestResult {
  passed: string[];
  failed: string[];
  skipped: string[];
}

export async function testTypeScriptCompilation(module: string, result: TestResult): Promise<void> {
  const dir = path.join(ROOT_DIR, module);
  const tsconfigPath = path.join(dir, 'tsconfig.json');

  if (!fileExists(dir)) {
    result.skipped.push(`TypeScript compilation: ${module} (not found)`);
    return;
  }

  if (!fileExists(tsconfigPath)) {
    result.skipped.push(`TypeScript compilation: ${module} (no tsconfig)`);
    return;
  }

  const { exitCode } = await runCommand('pnpm build', { cwd: dir, timeout: 60000 });

  if (exitCode === 0) {
    result.passed.push(`TypeScript compilation: ${module}`);
  } else {
    result.failed.push(`TypeScript compilation: ${module}: Compilation errors`);
  }
}

export async function testPackageJson(module: string, result: TestResult): Promise<void> {
  const pkgPath = path.join(ROOT_DIR, module, 'package.json');

  if (!fileExists(pkgPath)) {
    result.skipped.push(`Package.json: ${module} (not found)`);
    return;
  }

  try {
    const pkg = require(pkgPath);
    if (pkg.name && pkg.version) {
      result.passed.push(`Package.json: ${module} (${pkg.name}@${pkg.version})`);
    } else {
      result.failed.push(`Package.json: ${module}: Missing name or version`);
    }
  } catch {
    result.failed.push(`Package.json: ${module}: Invalid JSON`);
  }
}

export async function testMcpTools(result: TestResult): Promise<void> {
  const toolsDir = path.join(ROOT_DIR, 'mcp-server/src/tools');

  if (!fileExists(toolsDir)) {
    result.skipped.push('MCP tools: tools directory not found');
    return;
  }

  const { stdout } = await runCommand(`find "${toolsDir}" -name "*.ts" -type f ! -name "index.ts" ! -name "types.ts" | wc -l`);
  const toolCount = parseInt(stdout.trim(), 10);

  if (toolCount > 0) {
    result.passed.push(`MCP tools: ${toolCount} tool modules`);
  } else {
    result.failed.push('MCP tools: No tool files found');
  }
}

export async function testAdapters(result: TestResult): Promise<void> {
  const adaptersDir = path.join(ROOT_DIR, 'mcp-server/src/adapters');

  if (!fileExists(adaptersDir)) {
    result.skipped.push('Adapters: directory not found');
    return;
  }

  const dirs = listDirectories(adaptersDir);
  let valid = 0;
  let invalid = 0;

  for (const name of dirs) {
    const indexPath = path.join(adaptersDir, name, 'index.ts');
    if (fileExists(indexPath)) {
      const { stdout } = await runCommand(`grep -E "export (const|async)" "${indexPath}" || true`);
      if (stdout.trim()) {
        valid++;
      } else {
        invalid++;
        result.failed.push(`Adapter: ${name}: No exports in index.ts`);
      }
    } else {
      invalid++;
      result.failed.push(`Adapter: ${name}: Missing index.ts`);
    }
  }

  if (valid > 0 && invalid === 0) {
    result.passed.push(`Adapters: ${valid} modules validated`);
  } else if (valid > 0) {
    result.passed.push(`Adapters: ${valid} valid, ${invalid} invalid`);
  }
}
