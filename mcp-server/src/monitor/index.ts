/**
 * Monitor Server
 * Bull Board UI + Health endpoints
 */

import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/dist/queueAdapters/bullMQ.js';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { createLogger } from '@elio/shared';

const logger = createLogger('monitor');

// Redis connection
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

// Unified queue from @elio/executor
const QUEUE_NAMES = [
  'elio-tasks',
];

let queues: Queue[] = [];
let serverAdapter: ExpressAdapter;

export async function startMonitor(port = 3333): Promise<void> {
  const app = express();

  // Create queues
  queues = QUEUE_NAMES.map(name => new Queue(name, { connection }));

  // Setup Bull Board
  serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/queues');

  createBullBoard({
    queues: queues.map(q => new BullMQAdapter(q)),
    serverAdapter,
  });

  app.use('/queues', serverAdapter.getRouter());

  // Health endpoint
  app.get('/health', async (_req, res) => {
    try {
      const status = await getSystemStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Quick status endpoint
  app.get('/status', async (_req, res) => {
    try {
      const queueStats = await Promise.all(
        queues.map(async (q) => ({
          name: q.name,
          waiting: await q.getWaitingCount(),
          active: await q.getActiveCount(),
          completed: await q.getCompletedCount(),
          failed: await q.getFailedCount(),
        }))
      );
      res.json({ queues: queueStats, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Kill job endpoint
  app.post('/jobs/:queue/:jobId/remove', async (req, res) => {
    try {
      const { queue: queueName, jobId } = req.params;
      const queue = queues.find(q => q.name === queueName);
      if (!queue) {
        return res.status(404).json({ error: 'Queue not found' });
      }
      const job = await queue.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      await job.remove();
      logger.info(`Removed job ${jobId} from ${queueName}`);
      return res.json({ success: true, message: `Job ${jobId} removed` });
    } catch (error) {
      return res.status(500).json({ error: String(error) });
    }
  });

  app.listen(port, () => {
    logger.info(`Monitor server running at http://localhost:${port}`);
    logger.info(`Bull Board UI: http://localhost:${port}/queues`);
    logger.info(`Health check: http://localhost:${port}/health`);
    logger.info(`Quick status: http://localhost:${port}/status`);
  });
}

async function getSystemStatus() {
  const queueStats = await Promise.all(
    queues.map(async (q) => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        q.getWaitingCount(),
        q.getActiveCount(),
        q.getCompletedCount(),
        q.getFailedCount(),
        q.getDelayedCount(),
      ]);
      return { name: q.name, waiting, active, completed, failed, delayed };
    })
  );

  // Get recent failed jobs
  const recentFailures = await Promise.all(
    queues.map(async (q) => {
      const failed = await q.getFailed(0, 5);
      return {
        queue: q.name,
        failures: failed.map(j => ({
          id: j.id,
          name: j.name,
          failedReason: j.failedReason,
          timestamp: j.timestamp,
        })),
      };
    })
  );

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: { host: connection.host, port: connection.port },
    queues: queueStats,
    recentFailures: recentFailures.filter(f => f.failures.length > 0),
  };
}

export async function stopMonitor(): Promise<void> {
  await Promise.all(queues.map(q => q.close()));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMonitor().catch(console.error);
}
