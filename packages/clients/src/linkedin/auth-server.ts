/**
 * LinkedIn OAuth - Auth Server
 * One-time callback server for OAuth flow
 */

import { createLogger } from '@elio/shared';
import { exchangeCode, getAuthUrl } from './oauth.js';

const log = createLogger('LinkedIn:AuthServer');

/**
 * Start OAuth callback server for one-time auth
 */
export async function startAuthServer(port: number = 3000): Promise<string> {
  const { createServer } = await import('http');

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://localhost:${port}`);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<h1>Error: ${error}</h1>`);
          server.close();
          reject(new Error(error));
          return;
        }

        if (code) {
          try {
            await exchangeCode(code);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h1>LinkedIn connected!</h1><p>You can close this window.</p>');
            server.close();
            resolve('success');
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<h1>Error</h1><p>${err}</p>`);
            server.close();
            reject(err);
          }
          return;
        }
      }

      // Redirect to auth
      const authUrl = getAuthUrl();
      res.writeHead(302, { Location: authUrl });
      res.end();
    });

    server.listen(port, () => {
      log.info(`Server started at http://localhost:${port}`);
      log.info('Open this URL to authenticate:', { url: getAuthUrl() });
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Auth timeout'));
    }, 5 * 60 * 1000);
  });
}
