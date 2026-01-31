#!/usr/bin/env npx tsx
/**
 * Watchdog HTTP Server
 * Lightweight Hono server with endpoints for Make (Integromat)
 *
 * Endpoints:
 *   GET  /watchdog/check   - Run check & repair, return JSON
 *   GET  /watchdog/status  - Get current heartbeat status
 *   POST /watchdog/seed    - Create expected heartbeats for today
 *   GET  /watchdog/health  - Simple health check
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { checkAndRepair, formatTelegramAlert } from './checker.js';
import { seedExpectedHeartbeats } from './seeder.js';
import { getDb } from '../mcp-server/src/db/index.js';
import { sendTelegram } from '../mcp-server/src/utils/progress/telegram.js';

const app = new Hono();
const PORT = parseInt(process.env.WATCHDOG_PORT || '3847', 10);
const API_KEY = process.env.WATCHDOG_API_KEY || '';

// Simple API key auth middleware
app.use('*', async (c, next) => {
  if (API_KEY) {
    const key = c.req.header('x-api-key') || c.req.query('key');
    if (key !== API_KEY) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }
  await next();
});

// Health check
app.get('/watchdog/health', (c) => {
  return c.json({ ok: true, timestamp: new Date().toISOString() });
});

// Main check endpoint — Make calls this
app.get('/watchdog/check', async (c) => {
  const result = await checkAndRepair();

  // Send Telegram alert if issues found
  if (!result.ok) {
    const alert = formatTelegramAlert(result);
    if (alert) {
      try {
        await sendTelegram(alert);
      } catch (err) {
        result.errors.push(`Telegram alert failed: ${err}`);
      }
    }
  }

  return c.json(result, result.ok ? 200 : 500);
});

// Get status dashboard
app.get('/watchdog/status', async (c) => {
  const hours = parseInt(c.req.query('hours') || '48', 10);
  const status = await getDb().watchdog.getStatus(hours);
  return c.json({ status, timestamp: new Date().toISOString() });
});

// Seed expected heartbeats (Make calls this daily before tasks run)
app.post('/watchdog/seed', async (c) => {
  const seeded = await seedExpectedHeartbeats();
  return c.json({ seeded, timestamp: new Date().toISOString() });
});

// Start server
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[Watchdog] Server running on port ${PORT}`);
});
