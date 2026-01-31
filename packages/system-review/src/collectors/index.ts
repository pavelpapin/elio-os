/**
 * Collector orchestrator
 * Runs all collectors in parallel, returns ReviewData
 */

import type { ReviewData } from '../types.js';
import {
  DEFAULT_GIT,
  DEFAULT_TYPESCRIPT,
  DEFAULT_ESLINT,
  DEFAULT_ARCHITECTURE,
  DEFAULT_SECURITY,
  DEFAULT_INFRA,
  DEFAULT_MAINTENANCE,
  DEFAULT_TEST_COVERAGE,
  DEFAULT_DEPENDENCIES,
  DEFAULT_CODE_QUALITY,
  DEFAULT_CONSISTENCY,
  DEFAULT_RUNTIME_HEALTH,
  DEFAULT_HISTORY,
} from '../types.js';
import { collectGit } from './git.js';
import { collectTypescript } from './typescript.js';
import { collectEslint } from './eslint.js';
import { collectArchitecture } from './architecture.js';
import { collectSecurity } from './security.js';
import { collectInfra } from './infra.js';
import { collectMaintenance } from './maintenance.js';
import { collectTestCoverage } from './test-coverage.js';
import { collectDependencies } from './dependencies.js';
import { collectCodeQuality } from './code-quality.js';
import { collectConsistency } from './consistency.js';
import { collectRuntimeHealth } from './runtime-health.js';
import { collectHistory } from './history.js';

export async function collectAll(basePath: string): Promise<ReviewData> {
  const mcp = `${basePath}/mcp-server`;

  const [
    git, ts, eslint, arch, sec, infra, maint,
    testCov, deps, quality, consistency, runtime, history,
  ] = await Promise.allSettled([
    Promise.resolve(collectGit(basePath)),
    Promise.resolve(collectTypescript(mcp)),
    Promise.resolve(collectEslint(mcp)),
    Promise.resolve(collectArchitecture(basePath)),
    Promise.resolve(collectSecurity(mcp)),
    Promise.resolve(collectInfra()),
    Promise.resolve(collectMaintenance(basePath)),
    Promise.resolve(collectTestCoverage(mcp)),
    Promise.resolve(collectDependencies(mcp)),
    Promise.resolve(collectCodeQuality(basePath)),
    Promise.resolve(collectConsistency(basePath)),
    Promise.resolve(collectRuntimeHealth(basePath)),
    Promise.resolve(collectHistory(basePath)),
  ]);

  return {
    timestamp: new Date().toISOString(),
    git: unwrap(git, DEFAULT_GIT),
    typescript: unwrap(ts, DEFAULT_TYPESCRIPT),
    eslint: unwrap(eslint, DEFAULT_ESLINT),
    architecture: unwrap(arch, DEFAULT_ARCHITECTURE),
    security: unwrap(sec, DEFAULT_SECURITY),
    infra: unwrap(infra, DEFAULT_INFRA),
    maintenance: unwrap(maint, DEFAULT_MAINTENANCE),
    testCoverage: unwrap(testCov, DEFAULT_TEST_COVERAGE),
    dependencies: unwrap(deps, DEFAULT_DEPENDENCIES),
    codeQuality: unwrap(quality, DEFAULT_CODE_QUALITY),
    consistency: unwrap(consistency, DEFAULT_CONSISTENCY),
    runtimeHealth: unwrap(runtime, DEFAULT_RUNTIME_HEALTH),
    history: unwrap(history, DEFAULT_HISTORY),
  };
}

function unwrap<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback;
}
