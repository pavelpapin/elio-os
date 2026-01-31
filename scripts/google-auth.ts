#!/usr/bin/env npx tsx
/**
 * Google OAuth Setup Script
 * Run: cd /root/.claude && npx tsx scripts/google-auth.ts
 */

import { createServer } from 'http';
import { parse } from 'url';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { paths } from '@elio/shared';

const CREDENTIALS_PATH = paths.credentials.google;
const TOKEN_PATH = paths.credentials.googleToken;

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.readonly',
];

interface Credentials {
  installed?: { client_id: string; client_secret: string; redirect_uris: string[] };
  web?: { client_id: string; client_secret: string; redirect_uris: string[] };
}

async function exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string) {
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  return response.json();
}

async function main() {
  console.log('\n=== Google OAuth Setup ===\n');

  // Check for credentials file
  if (!existsSync(CREDENTIALS_PATH)) {
    console.log('ERROR: Google credentials not found!');
    console.log(`Expected at: ${CREDENTIALS_PATH}\n`);
    console.log('Steps to create:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create project or select existing');
    console.log('3. Enable APIs: Gmail, Sheets, Calendar, Docs, Drive');
    console.log('4. Go to Credentials > Create Credentials > OAuth client ID');
    console.log('5. Application type: Desktop app');
    console.log('6. Download JSON and save to:');
    console.log(`   ${CREDENTIALS_PATH}\n`);
    process.exit(1);
  }

  const credentials: Credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const config = credentials.installed || credentials.web;

  if (!config) {
    console.log('ERROR: Invalid credentials format');
    process.exit(1);
  }

  const { client_id, client_secret } = config;
  const redirectUri = 'http://localhost:3333/oauth/callback';

  // Build auth URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', client_id);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log('Open this URL in browser:\n');
  console.log(authUrl.toString());
  console.log('\nWaiting for callback on http://localhost:3333...\n');

  // Start local server to receive callback
  const server = createServer(async (req, res) => {
    const urlParsed = parse(req.url || '', true);

    if (urlParsed.pathname === '/oauth/callback') {
      const code = urlParsed.query.code as string;

      if (code) {
        console.log('Received authorization code, exchanging for token...');

        try {
          const token = await exchangeCodeForToken(code, client_id, client_secret, redirectUri);

          if (token.error) {
            console.log('ERROR:', token.error_description || token.error);
            res.writeHead(500);
            res.end('Error: ' + (token.error_description || token.error));
          } else {
            // Save token
            const tokenData = {
              access_token: token.access_token,
              refresh_token: token.refresh_token,
              scope: token.scope,
              token_type: token.token_type,
              expiry_date: Date.now() + (token.expires_in * 1000),
            };

            writeFileSync(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
            console.log('\nSUCCESS! Token saved to:', TOKEN_PATH);
            console.log('\nGoogle APIs now available:');
            console.log('- Gmail (read/send)');
            console.log('- Google Sheets');
            console.log('- Google Calendar');
            console.log('- Google Docs');
            console.log('- Google Drive (read)\n');

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h1>Success!</h1><p>Google authorization complete. You can close this window.</p>');
          }
        } catch (error) {
          console.log('ERROR:', error);
          res.writeHead(500);
          res.end('Error exchanging code');
        }

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);
      } else {
        res.writeHead(400);
        res.end('No code received');
      }
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(3333, () => {
    console.log('Server listening on port 3333...');
  });
}

main().catch(console.error);
