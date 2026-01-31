/**
 * Notification Manager
 * Handles debounced and immediate notifications for progress reporting
 */

import type { NotificationChannel } from '../notifications/types.js'
import { createLogger } from '@elio/shared'
const log = createLogger('workflow:progress:notifications')

export interface NotificationManagerConfig {
  chatId?: number | string
  notificationChannel?: NotificationChannel
  enableNotifications: boolean
  debounceMs: number
}

export class NotificationManager {
  private readonly config: NotificationManagerConfig
  private notificationTimer?: NodeJS.Timeout
  private pendingNotification?: string
  private lastNotificationTime = 0

  constructor(config: NotificationManagerConfig) {
    this.config = config
  }

  /**
   * Queue a notification with debouncing
   */
  queue(message: string): void {
    if (!this.config.enableNotifications || !this.config.chatId) return

    this.pendingNotification = message

    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer)
    }

    this.notificationTimer = setTimeout(() => {
      if (this.pendingNotification) {
        this.sendImmediate(this.pendingNotification)
        this.pendingNotification = undefined
      }
    }, this.config.debounceMs)
  }

  /**
   * Send notification immediately, bypassing debounce
   */
  async sendImmediate(message: string): Promise<boolean> {
    if (!this.config.notificationChannel || !this.config.chatId) {
      return false
    }

    try {
      return await this.config.notificationChannel.send(this.config.chatId, message, {
        parseMode: 'Markdown',
      })
    } catch (error) {
      log.error('Notification failed:', error)
      return false
    }
  }

  /**
   * Flush any pending notifications
   */
  async flush(): Promise<void> {
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer)
      this.notificationTimer = undefined
    }

    if (this.pendingNotification) {
      await this.sendImmediate(this.pendingNotification)
      this.pendingNotification = undefined
    }
  }

  /**
   * Create a progress bar
   */
  makeProgressBar(percent: number): string {
    const filled = Math.round(percent / 10)
    const empty = 10 - filled
    return '▓'.repeat(filled) + '░'.repeat(empty)
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.flush()
  }
}
