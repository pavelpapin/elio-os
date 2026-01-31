/**
 * Resilience utilities for external API calls
 */

export {
  withRateLimit,
  acquire,
  release,
  getStatus as getRateLimitStatus,
  getAllStatus as getAllRateLimitStatus,
  configure as configureRateLimit,
  resetLimits,
  type RateLimitConfig
} from './rate-limiter.js';

export {
  withCircuitBreaker,
  isOpen,
  recordSuccess,
  recordFailure,
  getStatus as getCircuitStatus,
  getAllStatus as getAllCircuitStatus,
  reset as resetCircuit,
  resetAll as resetAllCircuits,
  type CircuitState,
  type CircuitConfig
} from './circuit-breaker.js';

/**
 * Convenience wrapper combining rate limiting and circuit breaker
 */
export async function withResilience<T>(
  service: string,
  fn: () => Promise<T>
): Promise<T> {
  const { withRateLimit } = await import('./rate-limiter.js');
  const { withCircuitBreaker } = await import('./circuit-breaker.js');

  return withRateLimit(service, () => withCircuitBreaker(service, fn));
}
