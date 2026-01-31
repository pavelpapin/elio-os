/**
 * Progress Stream Writer
 * Handles Redis Streams for workflow progress output
 */

import type { Redis } from 'ioredis'
import { REDIS_KEYS, type StreamUpdate } from '../types.js'

export async function pushToStream(
  redis: Redis,
  workflowId: string,
  type: StreamUpdate['type'],
  content: string,
  maxEntries: number,
): Promise<void> {
  const streamKey = REDIS_KEYS.workflowOutput(workflowId)

  await redis.xadd(
    streamKey,
    'MAXLEN', '~', maxEntries.toString(),
    '*',
    'type', type,
    'content', content,
    'timestamp', Date.now().toString()
  )
}
