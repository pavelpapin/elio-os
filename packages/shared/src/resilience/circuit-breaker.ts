/**
 * Circuit Breaker
 * Prevents cascade failures by temporarily stopping requests to failing services
 */

import { createLogger } from '../logger.js';
import { notify } from '../notify.js';

const logger = createLogger('circuit-breaker');

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests: number;
}

interface ServiceCircuit {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number;
  nextRetry: number;
  halfOpenAllowed: number;
}

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 3,
  resetTimeout: 30000,
  halfOpenRequests: 1
};

const SERVICE_CONFIGS: Record<string, Partial<CircuitConfig>> = {
  perplexity: { failureThreshold: 5, resetTimeout: 60000 },
  notion: { failureThreshold: 3, resetTimeout: 30000 },
  gmail: { failureThreshold: 5, resetTimeout: 30000 },
  linkedin: { failureThreshold: 2, resetTimeout: 120000 },
  openai: { failureThreshold: 5, resetTimeout: 60000 },
  anthropic: { failureThreshold: 5, resetTimeout: 60000 },
  groq: { failureThreshold: 5, resetTimeout: 60000 }
};

const circuits = new Map<string, ServiceCircuit>();

function getCircuit(service: string): ServiceCircuit {
  let circuit = circuits.get(service);
  if (!circuit) {
    circuit = {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailure: 0,
      nextRetry: 0,
      halfOpenAllowed: 0
    };
    circuits.set(service, circuit);
  }
  return circuit;
}

function getConfig(service: string): CircuitConfig {
  return { ...DEFAULT_CONFIG, ...SERVICE_CONFIGS[service] };
}

export function isOpen(service: string): boolean {
  const circuit = getCircuit(service);
  const config = getConfig(service);
  const now = Date.now();

  if (circuit.state === 'closed') {
    return false;
  }

  if (circuit.state === 'open') {
    if (now >= circuit.nextRetry) {
      circuit.state = 'half-open';
      circuit.halfOpenAllowed = config.halfOpenRequests;
      logger.info(`${service} transitioning to half-open`);
      return false;
    }
    return true;
  }

  if (circuit.state === 'half-open') {
    if (circuit.halfOpenAllowed > 0) {
      circuit.halfOpenAllowed--;
      return false;
    }
    return true;
  }

  return false;
}

export function recordSuccess(service: string): void {
  const circuit = getCircuit(service);

  if (circuit.state === 'half-open') {
    circuit.state = 'closed';
    circuit.failures = 0;
    circuit.successes = 0;
    logger.info(`${service} circuit closed (recovered)`);
    void notify(`✅ ${service} recovered`);
  }

  circuit.successes++;
}

export function recordFailure(service: string, error?: string): void {
  const circuit = getCircuit(service);
  const config = getConfig(service);
  const now = Date.now();

  circuit.failures++;
  circuit.lastFailure = now;

  logger.warn(`${service} failure recorded`, {
    failures: circuit.failures,
    threshold: config.failureThreshold,
    error
  });

  if (circuit.state === 'half-open') {
    circuit.state = 'open';
    circuit.nextRetry = now + config.resetTimeout;
    logger.error(`${service} circuit reopened`);
    void notify(`⚠️ ${service} still failing, circuit reopened`);
    return;
  }

  if (circuit.state === 'closed' && circuit.failures >= config.failureThreshold) {
    circuit.state = 'open';
    circuit.nextRetry = now + config.resetTimeout;
    logger.error(`${service} circuit opened`, {
      failures: circuit.failures,
      retryIn: config.resetTimeout
    });
    void notify(`🔴 ${service} circuit OPEN (${circuit.failures} failures). Retry in ${config.resetTimeout / 1000}s`);
  }
}

export function getStatus(service: string): {
  state: CircuitState;
  failures: number;
  nextRetryIn: number | null;
} {
  const circuit = getCircuit(service);
  const now = Date.now();

  return {
    state: circuit.state,
    failures: circuit.failures,
    nextRetryIn: circuit.state === 'open' ? Math.max(0, circuit.nextRetry - now) : null
  };
}

export function getAllStatus(): Record<string, ReturnType<typeof getStatus>> {
  const result: Record<string, ReturnType<typeof getStatus>> = {};
  circuits.forEach((_circuit, service) => {
    result[service] = getStatus(service);
  });
  return result;
}

export function reset(service: string): void {
  const circuit = getCircuit(service);
  circuit.state = 'closed';
  circuit.failures = 0;
  circuit.successes = 0;
  logger.info(`${service} circuit manually reset`);
}

export function resetAll(): void {
  circuits.clear();
}

export async function withCircuitBreaker<T>(
  service: string,
  fn: () => Promise<T>
): Promise<T> {
  if (isOpen(service)) {
    const status = getStatus(service);
    throw new Error(`Circuit open for ${service}. Retry in ${status.nextRetryIn}ms`);
  }

  try {
    const result = await fn();
    recordSuccess(service);
    return result;
  } catch (error) {
    recordFailure(service, String(error));
    throw error;
  }
}
