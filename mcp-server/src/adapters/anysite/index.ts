/**
 * AnySite Adapter
 * Exposes AnySite MCP tools (social media & web scraping via scraping/unofficial APIs)
 *
 * NOTE: Overlaps with dedicated adapters (youtube, twitter, linkedin).
 * - AnySite tools use scraping-based approach — no API keys needed, broader data access
 * - Dedicated adapters use official APIs — more reliable, rate-limited, structured
 * Prefer dedicated adapters for authenticated operations; use anysite for discovery/research.
 */

import { Adapter } from '../../gateway/types.js';
import * as anysite from '@elio/clients/anysite';

import { webTools } from './tools/web.js';
import { ycTools } from './tools/yc.js';
import { youtubeTools } from './tools/youtube.js';
import { linkedinTools } from './tools/linkedin.js';
import { twitterTools } from './tools/twitter.js';
import { instagramTools } from './tools/instagram.js';
import { redditTools } from './tools/reddit.js';
import { secTools } from './tools/sec.js';

const tools = [
  ...webTools,
  ...ycTools,
  ...youtubeTools,
  ...linkedinTools,
  ...twitterTools,
  ...instagramTools,
  ...redditTools,
  ...secTools
];

export const anysiteAdapter: Adapter = {
  name: 'anysite',
  isAuthenticated: anysite.isAuthenticated,
  tools
};
