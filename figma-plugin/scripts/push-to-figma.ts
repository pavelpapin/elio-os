/**
 * Push ELIO Prototype to Figma
 *
 * Starts WebSocket server, waits for Figma plugin connection,
 * then sends both design specs.
 *
 * Usage:
 *   npx tsx figma-plugin/scripts/push-to-figma.ts
 *
 * Prerequisites:
 *   1. Open Figma
 *   2. Run the "Elio Design Bridge" plugin
 *   3. Plugin connects to ws://localhost:9418
 *   4. This script sends both specs automatically
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
      } catch { /* ignore parse errors from other messages */ }
    };

    ws.on('message', handler);
    const command: PluginCommand = { id, type, payload };
    ws.send(JSON.stringify(command));
  });
}

async function main() {
  console.log('Starting WebSocket server on port', WS_PORT);

  const wss = new WebSocketServer({ port: WS_PORT });

  console.log('Waiting for Figma plugin to connect...');
  console.log('→ Open Figma and run the "Elio Design Bridge" plugin\n');

  wss.on('connection', async (ws) => {
    console.log('Plugin connected!\n');

    try {
      // Ping
      const pong = await sendCommand(ws, 'ping', null);
      console.log('Ping:', pong.status);

      // Screen 1: Owner Dashboard
      console.log('\nCreating Screen 1: Owner Dashboard...');
      const ownerSpec = loadSpec('owner-dashboard.json');
      const ownerResult = await sendCommand(ws, 'create_design', ownerSpec);
      if (ownerResult.status === 'ok') {
        console.log('Owner Dashboard created:', ownerResult.data);
      } else {
        console.error('Owner Dashboard failed:', ownerResult.error);
      }

      // Screen 2: Agent View
      console.log('\nCreating Screen 2: Agent View...');
      const agentSpec = loadSpec('agent-view.json');
      const agentResult = await sendCommand(ws, 'create_design', agentSpec);
      if (agentResult.status === 'ok') {
        console.log('Agent View created:', agentResult.data);
      } else {
        console.error('Agent View failed:', agentResult.error);
      }

      console.log('\nDone! Both screens are now in your Figma file.');
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
