/**
 * Push VALUE Screens to Figma
 *
 * Creates 3 screens for website VALUE blocks:
 * 1. Deal Visibility
 * 2. SLA & Quality Control
 * 3. Action Queue
 *
 * Usage:
 *   npx tsx figma-plugin/scripts/push-value-screens.ts
 *
 * Prerequisites:
 *   1. Open Figma
 *   2. Run the "Elio Design Bridge" plugin
 *   3. Plugin connects to ws://localhost:9418
 */

import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { resolve } from 'path';

const WS_PORT = 9418;
const SPECS_DIR = resolve(import.meta.dirname, '../specs');
const TIMEOUT_MS = 60_000;

interface PluginCommand {
  id: string;
  type: string;
  payload: unknown;
}

interface PluginResponse {
  id: string;
  status: 'ok' | 'error';
  data?: Record<string, unknown>;
  error?: string;
}

function loadSpec(filename: string): unknown {
  const path = resolve(SPECS_DIR, filename);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function sendCommand(ws: WebSocket, type: string, payload: unknown): Promise<PluginResponse> {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const timer = setTimeout(() => reject(new Error(`Timeout: ${type}`)), TIMEOUT_MS);

    const handler = (raw: Buffer) => {
      try {
        const response = JSON.parse(raw.toString()) as PluginResponse;
        if (response.id === id) {
          clearTimeout(timer);
          ws.off('message', handler);
          resolve(response);
        }
      } catch { /* ignore parse errors */ }
    };

    ws.on('message', handler);
    const command: PluginCommand = { id, type, payload };
    ws.send(JSON.stringify(command));
  });
}

async function main() {
  console.log('🚀 Starting WebSocket server on port', WS_PORT);

  const wss = new WebSocketServer({ port: WS_PORT });

  console.log('⏳ Waiting for Figma plugin to connect...');
  console.log('→ Open Figma and run the "Elio Design Bridge" plugin\n');

  wss.on('connection', async (ws) => {
    console.log('✅ Plugin connected!\n');

    try {
      // Ping
      const pong = await sendCommand(ws, 'ping', null);
      console.log('Ping:', pong.status);

      // Screen 1: Deal Visibility
      console.log('\n📊 Creating: Deal Visibility...');
      const dealSpec = loadSpec('deal-visibility.json');
      const dealResult = await sendCommand(ws, 'create_design', dealSpec);
      if (dealResult.status === 'ok') {
        console.log('   ✅ Deal Visibility created');
      } else {
        console.error('   ❌ Failed:', dealResult.error);
      }

      // Screen 2: SLA View
      console.log('\n⏱️  Creating: SLA & Quality Control...');
      const slaSpec = loadSpec('sla-view.json');
      const slaResult = await sendCommand(ws, 'create_design', slaSpec);
      if (slaResult.status === 'ok') {
        console.log('   ✅ SLA View created');
      } else {
        console.error('   ❌ Failed:', slaResult.error);
      }

      // Screen 3: Action Queue
      console.log('\n🎯 Creating: Action Queue...');
      const actionSpec = loadSpec('action-queue.json');
      const actionResult = await sendCommand(ws, 'create_design', actionSpec);
      if (actionResult.status === 'ok') {
        console.log('   ✅ Action Queue created');
      } else {
        console.error('   ❌ Failed:', actionResult.error);
      }

      console.log('\n🎉 Done! All 3 VALUE screens are now in your Figma file.');
      console.log('\nScreens created:');
      console.log('  1. ELIO — Deal Visibility (800x480)');
      console.log('  2. ELIO — SLA & Quality Control (800x520)');
      console.log('  3. ELIO — Action Queue (800x560)');
    } catch (err) {
      console.error('Error:', err);
    } finally {
      ws.close();
      wss.close();
      process.exit(0);
    }
  });
}

main();
