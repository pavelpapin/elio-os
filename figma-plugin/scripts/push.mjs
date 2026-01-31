import { WebSocketServer } from 'ws';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPECS_DIR = resolve(__dirname, '../specs');

function loadSpec(name) {
  return JSON.parse(readFileSync(resolve(SPECS_DIR, name), 'utf-8'));
}

function sendCommand(ws, type, payload) {
  return new Promise((res, rej) => {
    const id = randomUUID();
    const timer = setTimeout(() => rej(new Error('Timeout')), 60000);
    const handler = (raw) => {
      const r = JSON.parse(raw.toString());
      if (r.id === id) {
        clearTimeout(timer);
        ws.off('message', handler);
        res(r);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, type, payload }));
  });
}

const wss = new WebSocketServer({ port: 9418 });
console.log('WebSocket server on port 9418');
console.log('Waiting for Figma plugin...\n');

wss.on('connection', async (ws) => {
  console.log('Plugin connected!\n');
  try {
    const pong = await sendCommand(ws, 'ping', null);
    console.log('Ping:', pong.status);

    console.log('\nCreating Owner Dashboard...');
    const r1 = await sendCommand(ws, 'create_design', loadSpec('owner-dashboard.json'));
    console.log(r1.status === 'ok' ? 'Done!' : 'Error: ' + r1.error);

    console.log('\nCreating Agent View...');
    const r2 = await sendCommand(ws, 'create_design', loadSpec('agent-view.json'));
    console.log(r2.status === 'ok' ? 'Done!' : 'Error: ' + r2.error);

    console.log('\nBoth screens created!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    ws.close();
    wss.close();
    process.exit(0);
  }
});
