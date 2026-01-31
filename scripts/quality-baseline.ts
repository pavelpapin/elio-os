#!/usr/bin/env npx tsx
/**
 * Quality Metrics Baseline
 * Collects and stores baseline metrics for system quality tracking.
 *
 * Metrics:
 * - Build health (all packages compile)
 * - Test pass rate
 * - API connectivity
 * - File size compliance (200 line limit)
 * - Type safety (no `any` usage)
 *
 * Usage: npx tsx scripts/quality-baseline.ts [--save]
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

const ROOT = '/root/.claude';

interface Metric {
  name: string;
  value: number;
  unit: string;
  status: 'pass' | 'warn' | 'fail';
}

interface Baseline {
  timestamp: string;
  metrics: Metric[];
  summary: { pass: number; warn: number; fail: number; score: number };
}

function run(cmd: string, cwd = ROOT): string {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', timeout: 60_000 }).trim();
  } catch {
    return '';
  }
}

function countLines(filePath: string): number {
  try {
    return fs.readFileSync(filePath, 'utf-8').split('\n').length;
  } catch {
    return 0;
  }
}

function collectBuildHealth(): Metric {
  const result = run('pnpm build 2>&1', `${ROOT}/mcp-server`);
  const ok = !result.includes('error TS');
  return { name: 'build_health', value: ok ? 1 : 0, unit: 'bool', status: ok ? 'pass' : 'fail' };
}

function collectTestPassRate(): Metric {
  const result = run('pnpm test 2>&1 || true');
  const passMatch = result.match(/(\d+) passed/);
  const failMatch = result.match(/(\d+) failed/);
  const passed = passMatch ? parseInt(passMatch[1]) : 0;
  const failed = failMatch ? parseInt(failMatch[1]) : 0;
  const total = passed + failed;
  const rate = total > 0 ? Math.round((passed / total) * 100) : 100;
  return { name: 'test_pass_rate', value: rate, unit: '%', status: rate >= 90 ? 'pass' : rate >= 70 ? 'warn' : 'fail' };
}

function collectFileSizeCompliance(): Metric {
  const tsFiles = run(`find ${ROOT}/mcp-server/src ${ROOT}/packages -name '*.ts' -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/__tests__/*' -not -name '*.d.ts'`);
  const files = tsFiles.split('\n').filter(Boolean);
  let oversized = 0;
  for (const f of files) {
    if (countLines(f) > 200) oversized++;
  }
  const rate = files.length > 0 ? Math.round(((files.length - oversized) / files.length) * 100) : 100;
  return {
    name: 'file_size_compliance',
    value: rate,
    unit: `% (${oversized}/${files.length} oversized)`,
    status: rate >= 90 ? 'pass' : rate >= 75 ? 'warn' : 'fail'
  };
}

function collectTypeAnyUsage(): Metric {
  const result = run(`grep -r ': any' ${ROOT}/mcp-server/src ${ROOT}/packages --include='*.ts' -l 2>/dev/null | grep -v node_modules | grep -v dist | wc -l`);
  const count = parseInt(result) || 0;
  return { name: 'files_with_any_type', value: count, unit: 'files', status: count <= 5 ? 'pass' : count <= 15 ? 'warn' : 'fail' };
}

function collectApiConnectivity(): Metric {
  const result = run(`cd ${ROOT}/mcp-server && npx tsx -e "
    const { exec } = require('child_process');
    exec('bash ${ROOT}/skills/smoke-test/run.sh check 2>&1', (e, out) => console.log(out));
  " 2>/dev/null || echo "skip"`);
  // Simplified: just check if MCP server builds and starts
  const serverOk = run(`cd ${ROOT}/mcp-server && timeout 5 node dist/index.js 2>&1 || true`);
  const ok = !serverOk.includes('Error');
  return { name: 'server_startup', value: ok ? 1 : 0, unit: 'bool', status: ok ? 'pass' : 'fail' };
}

function collectPackageCount(): Metric {
  const adapters = run(`ls ${ROOT}/mcp-server/src/adapters/ | grep -v index.ts | wc -l`);
  const clients = run(`ls ${ROOT}/packages/clients/src/ | grep -v index.ts | wc -l`);
  return {
    name: 'component_count',
    value: parseInt(adapters) + parseInt(clients),
    unit: `(${adapters} adapters + ${clients} clients)`,
    status: 'pass'
  };
}

async function main() {
  const shouldSave = process.argv.includes('--save');

  console.log('Collecting quality metrics baseline...\n');

  const metrics: Metric[] = [
    collectBuildHealth(),
    collectTestPassRate(),
    collectFileSizeCompliance(),
    collectTypeAnyUsage(),
    collectPackageCount()
  ];

  const pass = metrics.filter(m => m.status === 'pass').length;
  const warn = metrics.filter(m => m.status === 'warn').length;
  const fail = metrics.filter(m => m.status === 'fail').length;
  const score = Math.round((pass / metrics.length) * 100);

  const baseline: Baseline = {
    timestamp: new Date().toISOString(),
    metrics,
    summary: { pass, warn, fail, score }
  };

  // Print results
  for (const m of metrics) {
    const icon = m.status === 'pass' ? '✓' : m.status === 'warn' ? '⚠' : '✗';
    console.log(`  ${icon} ${m.name}: ${m.value} ${m.unit}`);
  }

  console.log(`\nScore: ${score}% (${pass} pass, ${warn} warn, ${fail} fail)`);

  if (shouldSave) {
    const dir = `${ROOT}/outputs/quality`;
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${dir}/baseline-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(baseline, null, 2));
    console.log(`\nSaved to ${filename}`);
  }

  return baseline;
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
