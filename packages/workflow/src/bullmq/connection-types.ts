/**
 * Redis Connection Types
 * Type definitions and constants for Redis connections
 */

export interface RedisConfig {
  host: string
  port: number
  password?: string
  db?: number
  maxRetriesPerRequest?: number | null
  retryStrategy?: (times: number) => number | null
  enableReadyCheck?: boolean
  lazyConnect?: boolean
}

export type ConnectionType = 'queue' | 'stream' | 'state' | 'default'

// Environment-based configuration
export const ENV_CONFIG: Record<ConnectionType, RedisConfig> = {
  queue: {
    host: process.env.REDIS_QUEUE_HOST || process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_QUEUE_PORT || process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_QUEUE_PASSWORD || process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_QUEUE_DB || '0', 10),
  },
  stream: {
    host: process.env.REDIS_STREAM_HOST || process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_STREAM_PORT || process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_STREAM_PASSWORD || process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_STREAM_DB || '1', 10),
  },
  state: {
    host: process.env.REDIS_STATE_HOST || process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_STATE_PORT || process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_STATE_PASSWORD || process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_STATE_DB || '2', 10),
  },
  default: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
}

export const MAX_RETRIES = 10
export const MAX_BACKOFF_MS = 30000
