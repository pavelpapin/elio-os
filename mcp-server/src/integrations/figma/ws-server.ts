/**
 * WebSocket Bridge Server
 * Connects MCP adapter with Figma Plugin
 */

import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import type { PluginCommand, PluginResponse, DesignSpec, ModifySpec } from './types.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('figma-ws');
const WS_PORT = 9418;
const COMMAND_TIMEOUT_MS = 30_000;

let wss: WebSocketServer | null = null;
let pluginSocket: WebSocket | null = null;
const pendingCommands = new Map<string, {
  resolve: (value: PluginResponse) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}>();

export function startServer(): void {
  if (wss) return;

  wss = new WebSocketServer({ port: WS_PORT });
  logger.info(`WebSocket server started on port ${WS_PORT}`);

  wss.on('connection', (ws) => {
    logger.info('Figma plugin connected');
    pluginSocket = ws;

    ws.on('message', (raw) => {
      try {
        const response = JSON.parse(raw.toString()) as PluginResponse;
        const pending = pendingCommands.get(response.id);
        if (pending) {
          clearTimeout(pending.timer);
          pendingCommands.delete(response.id);
          pending.resolve(response);
        }
      } catch (err) {
        logger.error('Failed to parse plugin message', { error: err });
      }
    });

    ws.on('close', () => {
      logger.info('Figma plugin disconnected');
      if (pluginSocket === ws) pluginSocket = null;
    });

    ws.on('error', (err) => {
      logger.error('WebSocket error', { error: err });
    });
  });
}

export function stopServer(): void {
  if (!wss) return;
  for (const [id, pending] of pendingCommands) {
    clearTimeout(pending.timer);
    pending.reject(new Error('Server shutting down'));
    pendingCommands.delete(id);
  }
  wss.close();
  wss = null;
  pluginSocket = null;
  logger.info('WebSocket server stopped');
}

export function isPluginConnected(): boolean {
  return pluginSocket !== null && pluginSocket.readyState === WebSocket.OPEN;
}

export function getStatus(): { connected: boolean; port: number; pending: number } {
  return {
    connected: isPluginConnected(),
    port: WS_PORT,
    pending: pendingCommands.size
  };
}

function sendCommand(command: PluginCommand): Promise<PluginResponse> {
  return new Promise((resolve, reject) => {
    if (!isPluginConnected()) {
      reject(new Error('Figma plugin not connected. Open Figma and run the Elio plugin.'));
      return;
    }

    const timer = setTimeout(() => {
      pendingCommands.delete(command.id);
      reject(new Error(`Command ${command.type} timed out after ${COMMAND_TIMEOUT_MS}ms`));
    }, COMMAND_TIMEOUT_MS);

    pendingCommands.set(command.id, { resolve, reject, timer });
    pluginSocket!.send(JSON.stringify(command));
  });
}

export async function createDesign(spec: DesignSpec): Promise<PluginResponse> {
  const command: PluginCommand = {
    id: randomUUID(),
    type: 'create_design',
    payload: spec
  };
  return sendCommand(command);
}

export async function modifyNode(spec: ModifySpec): Promise<PluginResponse> {
  const command: PluginCommand = {
    id: randomUUID(),
    type: 'modify_node',
    payload: spec
  };
  return sendCommand(command);
}

export async function getSelection(): Promise<PluginResponse> {
  const command: PluginCommand = {
    id: randomUUID(),
    type: 'get_selection',
    payload: null
  };
  return sendCommand(command);
}

export async function ping(): Promise<PluginResponse> {
  const command: PluginCommand = {
    id: randomUUID(),
    type: 'ping',
    payload: null
  };
  return sendCommand(command);
}
