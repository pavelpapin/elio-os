/**
 * Progress Notifier
 * Handles debounced Telegram notifications for workflow progress
 */

import type { NotificationChannel } from '../notifications/types.js'

export interface NotifierConfig {
  chatId?: number | string
  channel?: NotificationChannel
  debounceMs: number
  enabled: boolean
}

export class ProgressNotifier {
  private timer?: NodeJS.Timeout
  private pending?: string

  constructor(private readonly config: NotifierConfig) {}

  queue(message: string): void {
    if (!this.config.enabled || !this.config.chatId) return

    this.pending = message

    if (this.timer) clearTimeout(this.timer)

    this.timer = setTimeout(() => {
      if (this.pending) {
        this.sendImmediate(this.pending)
        this.pending = undefined
      }
    }, this.config.debounceMs)
  }

  async sendImmediate(message: string): Promise<boolean> {
    if (!this.config.channel || !this.config.chatId) return false

    try {
      return await this.config.channel.send(this.config.chatId, message, {
        parseMode: 'Markdown',
      })
    } catch {
      return false
    }
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    if (this.pending) {
      await this.sendImmediate(this.pending)
      this.pending = undefined
    }
  }

  makeProgressBar(percent: number): string {
    const filled = Math.round(percent / 10)
    const empty = 10 - filled
    return '▓'.repeat(filled) + '░'.repeat(empty)
  }
}
