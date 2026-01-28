/**
 * HTTP Probe for Service Health Checks
 */

import * as https from 'https';
import * as http from 'http';

export interface ProbeResult {
  ok: boolean;
  latency_ms: number;
  status?: number;
  error?: string;
}

export async function httpProbe(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<ProbeResult> {
  const { method = 'HEAD', headers = {}, timeout = 5000 } = options;
  const start = Date.now();

  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const lib = isHttps ? https : http;

      const req = lib.request({
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method,
        headers,
        timeout,
      }, (res) => {
        const latency_ms = Date.now() - start;
        res.resume();
        resolve({
          ok: res.statusCode !== undefined && res.statusCode < 500,
          latency_ms,
          status: res.statusCode
        });
      });

      req.on('error', (error) => {
        resolve({ ok: false, latency_ms: Date.now() - start, error: error.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, latency_ms: timeout, error: 'Connection timeout' });
      });

      req.end();
    } catch (error) {
      resolve({
        ok: false,
        latency_ms: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
