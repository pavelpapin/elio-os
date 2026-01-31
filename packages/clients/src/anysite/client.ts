/**
 * AnySite MCP HTTP Client
 * Calls AnySite tools via MCP-over-HTTP
 */

import { getEndpointUrl } from './config.js';

const DEFAULT_TIMEOUT = 60000;

interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

let requestCounter = 0;

export async function callTool<T = unknown>(
  toolName: string,
  params: Record<string, unknown> = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<T> {
  const url = getEndpointUrl();
  const id = ++requestCounter;

  const request: MCPRequest = {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: params
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`AnySite API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as MCPResponse;

    if (data.error) {
      throw new Error(`MCP error: ${data.error.message}`);
    }

    return data.result as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function listTools(): Promise<Array<{ name: string; description: string }>> {
  const url = getEndpointUrl();
  const id = ++requestCounter;

  const request: MCPRequest = {
    jsonrpc: '2.0',
    id,
    method: 'tools/list',
    params: {}
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  const data = await response.json() as MCPResponse;

  if (data.error) {
    throw new Error(`MCP error: ${data.error.message}`);
  }

  return (data.result as { tools: Array<{ name: string; description: string }> }).tools;
}
