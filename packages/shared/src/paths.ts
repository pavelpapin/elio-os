/**
 * Standard paths for Elio OS
 */

import * as path from 'path'
import * as os from 'os'

export const ELIO_ROOT = process.env.ELIO_ROOT || path.join(os.homedir(), '.claude')

export const paths = {
  root: ELIO_ROOT,
  base: ELIO_ROOT,
  skills: path.join(ELIO_ROOT, 'skills'),
  workflows: path.join(ELIO_ROOT, 'workflows'),
  context: path.join(ELIO_ROOT, 'context'),
  secrets: path.join(ELIO_ROOT, 'secrets'),

  credentials: {
    dir: path.join(ELIO_ROOT, 'secrets'),
    google: path.join(ELIO_ROOT, 'secrets', 'google-credentials.json'),
    googleToken: path.join(ELIO_ROOT, 'secrets', 'google-token.json'),
    perplexity: path.join(ELIO_ROOT, 'secrets', 'perplexity.json'),
    supabase: path.join(ELIO_ROOT, 'secrets', 'supabase.json'),
    exa: path.join(ELIO_ROOT, 'secrets', 'exa.json'),
    brave: path.join(ELIO_ROOT, 'secrets', 'brave.json'),
    serper: path.join(ELIO_ROOT, 'secrets', 'serper.json'),
    tavily: path.join(ELIO_ROOT, 'secrets', 'tavily.json'),
    notion: path.join(ELIO_ROOT, 'secrets', 'notion.json'),
    slack: path.join(ELIO_ROOT, 'secrets', 'slack.json'),
    telegram: path.join(ELIO_ROOT, 'secrets', 'telegram.json'),
    gmail: path.join(ELIO_ROOT, 'secrets', 'gmail.json'),
    sheets: path.join(ELIO_ROOT, 'secrets', 'sheets.json'),
    calendar: path.join(ELIO_ROOT, 'secrets', 'calendar.json'),
    docs: path.join(ELIO_ROOT, 'secrets', 'docs.json'),
    github: path.join(ELIO_ROOT, 'secrets', 'github.json'),
    groq: path.join(ELIO_ROOT, 'secrets', 'groq.json'),
    grok: path.join(ELIO_ROOT, 'secrets', 'grok.json'),
    twitter: path.join(ELIO_ROOT, 'secrets', 'twitter.json'),
    youtube: path.join(ELIO_ROOT, 'secrets', 'youtube.json'),
    openai: path.join(ELIO_ROOT, 'secrets', 'openai.json'),
    anthropic: path.join(ELIO_ROOT, 'secrets', 'anthropic.json'),
    linkedin: path.join(ELIO_ROOT, 'secrets', 'linkedin.json'),
    semanticscholar: path.join(ELIO_ROOT, 'secrets', 'semanticscholar.json'),
    scrapedo: path.join(ELIO_ROOT, 'secrets', 'scrapedo.json'),
    anysite: path.join(ELIO_ROOT, 'secrets', 'anysite.json'),
    n8n: path.join(ELIO_ROOT, 'secrets', 'n8n.json'),
    whisper: path.join(ELIO_ROOT, 'secrets', 'whisper.json'),
  },

  data: {
    dir: path.join(ELIO_ROOT, 'data'),
    notebooklmSources: path.join(ELIO_ROOT, 'data', 'notebooklm-sources'),
    scheduler: path.join(ELIO_ROOT, 'data', 'scheduler'),
    gtd: path.join(ELIO_ROOT, 'data', 'gtd'),
    headless: path.join(ELIO_ROOT, 'data', 'headless'),
    contextGraph: path.join(ELIO_ROOT, 'data', 'context-graph'),
    selfImprovement: path.join(ELIO_ROOT, 'data', 'self-improvement'),
  },

  logs: {
    dir: path.join(ELIO_ROOT, 'logs'),
    scheduler: path.join(ELIO_ROOT, 'logs', 'scheduler'),
    daily: path.join(ELIO_ROOT, 'logs', 'daily'),
    workflows: path.join(ELIO_ROOT, 'logs', 'workflows'),
  },

  mcpServer: path.join(ELIO_ROOT, 'mcp-server'),
  packages: path.join(ELIO_ROOT, 'packages'),
  apps: path.join(ELIO_ROOT, 'apps'),
  config: path.join(ELIO_ROOT, 'config'),
  claudeMd: path.join(ELIO_ROOT, 'CLAUDE.md'),
} as const

export function elioPath(...segments: string[]): string {
  return path.join(ELIO_ROOT, ...segments)
}
