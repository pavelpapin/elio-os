#!/usr/bin/env npx tsx
/**
 * Monitor CLI
 *
 * Usage:
 *   npx tsx src/monitor/cli.ts          # Start monitor + executor worker
 *   npx tsx src/monitor/cli.ts monitor  # Start only monitor (Bull Board UI)
 *   npx tsx src/monitor/cli.ts worker   # Start only executor worker
 *   npx tsx src/monitor/cli.ts status   # Show queue status
 */

import { startMonitor, stopMonitor } from './index.js';
import { Queue } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

// Lazy load executor to avoid circular deps
let executorInstance: Awaited<ReturnType<typeof import('@elio/executor').createExecutor>> | null = null;

async function getExecutor() {
  if (!executorInstance) {
    const { createExecutor } = await import('@elio/executor');
    executorInstance = await createExecutor();
  }
  return executorInstance;
}

async function showStatus() {
  const queue = new Queue('elio-tasks', { connection });

  console.log('\n=== Elio Tasks Queue ===\n');

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  console.log(`Waiting: ${waiting}`);
  console.log(`Active: ${active}`);
  console.log(`Completed: ${completed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Delayed: ${delayed}`);

  // Show recent failures
  if (failed > 0) {
    console.log('\nRecent failures:');
    const failures = await queue.getFailed(0, 5);
    for (const job of failures) {
      console.log(`  ❌ ${job.id} - ${job.failedReason?.slice(0, 80)}`);
    }
  }

  // Show active jobs
  if (active > 0) {
    console.log('\nActive jobs:');
    const activeJobs = await queue.getActive(0, 5);
    for (const job of activeJobs) {
      console.log(`  🔄 ${job.id} - ${job.name}`);
    }
  }

  await queue.close();
  console.log('\n');
}

async function main() {
  const command = process.argv[2] || 'all';

  console.log('╔════════════════════════════════════════╗');
  console.log('║     Elio Monitor (unified executor)    ║');
  console.log('╚════════════════════════════════════════╝');

  switch (command) {
    case 'monitor':
      console.log('\nStarting Monitor only...\n');
      await startMonitor(3333);
      break;

    case 'worker':
      console.log('\nStarting Executor Worker...\n');
      const executor = await getExecutor();
      await executor.startWorker();
      console.log('✅ Executor worker running');
      break;

    case 'status':
      await showStatus();
      process.exit(0);
      break;

    case 'all':
    default:
      console.log('\nStarting Monitor + Executor Worker...\n');
      await startMonitor(3333);
      const exec = await getExecutor();
      await exec.startWorker();
      console.log('\n✅ All systems running');
      console.log('   Bull Board: http://localhost:3333/queues');
      console.log('   Health:     http://localhost:3333/health');
      console.log('   Status:     http://localhost:3333/status');
      console.log('\nPress Ctrl+C to stop\n');
      break;
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('\nShutting down...');
  await stopMonitor();
  if (executorInstance) {
    await executorInstance.close();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
