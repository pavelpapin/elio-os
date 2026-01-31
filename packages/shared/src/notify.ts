/**
 * Shared Telegram notification utility
 *
 * Single source of truth for all notifications across Elio OS.
 * Loads credentials from environment variables (preferred) or secrets/.env file.
 *
 * Usage:
 *   import { notify } from '@elio/shared'
 *   await notify('Hello from Elio!')
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { createLogger } from './logger.js'

const log = createLogger('notify')

let botToken: string | undefined
let chatId: string | undefined
let loaded = false

function loadCredentials(): void {
  if (loaded) return
  loaded = true

  botToken = process.env.TELEGRAM_BOT_TOKEN
  chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    try {
      const root = process.env.ELIO_ROOT || join(process.env.HOME || '/root', '.claude')
      const envContent = readFileSync(join(root, 'secrets', '.env'), 'utf-8')
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim()
        if (trimmed.startsWith('#') || !trimmed.includes('=')) continue
        const [key, ...rest] = trimmed.split('=')
        const value = rest.join('=').trim()
        if (key === 'TELEGRAM_BOT_TOKEN' && !botToken) botToken = value
        if (key === 'TELEGRAM_CHAT_ID' && !chatId) chatId = value
      }
    } catch {
      // secrets/.env not found — that's OK
    }
  }
}

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

/**
 * Send a Telegram notification with retry.
 * Non-blocking, never throws — logs errors via unified logger.
 */
export async function notify(message: string): Promise<void> {
  loadCredentials()

  if (!botToken || !chatId) {
    log.warn(`No Telegram credentials, message: ${message}`)
    return
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
          }),
          signal: AbortSignal.timeout(10_000),
        },
      )

      if (response.ok) return

      // 429 or 5xx — retryable
      if (attempt < MAX_RETRIES && (response.status === 429 || response.status >= 500)) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt)
        log.warn(`Telegram API ${response.status}, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      log.error(`Telegram API error: ${response.status} (attempt ${attempt + 1})`)
      return
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt)
        log.warn(`Notify failed, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`, { error: String(err) })
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      log.error(`Failed to send after ${MAX_RETRIES + 1} attempts: ${err}`)
    }
  }
}
