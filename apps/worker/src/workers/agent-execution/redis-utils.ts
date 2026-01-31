/**
 * Redis utility functions for agent execution
 */

import type { Redis } from 'ioredis'
import type { StreamUpdate } from '@elio/workflow'

/**
 * Push update to Redis stream
 */
export async function pushOutput(
  redis: Redis,
  streamKey: string,
  update: StreamUpdate
): Promise<void> {
  await redis.xadd(
    streamKey,
    'MAXLEN', '~', '1000',
    '*',
    'type', update.type,
    'content', update.content,
    'timestamp', update.timestamp.toString()
  )
}
