/**
 * AnySite Adapter Utils
 */

import { withRateLimit } from '../../utils/rate-limiter.js';
import { withCircuitBreaker } from '../../utils/circuit-breaker.js';

export async function safeCall<T>(fn: () => Promise<T>): Promise<string> {
  try {
    const result = await withCircuitBreaker('anysite', () =>
      withRateLimit('anysite', fn)
    );
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return JSON.stringify({ error: (error as Error).message });
  }
}
