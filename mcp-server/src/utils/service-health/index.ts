/**
 * Per-Service Health Check Module
 */

export type { ServiceHealthResult, AllServicesHealth, ServiceChecker } from './types.js';
export { httpProbe } from './probe.js';
export { serviceCheckers } from './checkers.js';

import { serviceCheckers } from './checkers.js';
import type { ServiceHealthResult, AllServicesHealth } from './types.js';

export async function checkService(serviceName: string): Promise<ServiceHealthResult | null> {
  const checker = serviceCheckers.find(s => s.name === serviceName);
  if (!checker) return null;
  return checker.check();
}

export async function checkAllServices(): Promise<AllServicesHealth> {
  const results = await Promise.all(
    serviceCheckers.map(checker => checker.check())
  );

  const summary = {
    total: results.length,
    healthy: results.filter(r => r.status === 'healthy').length,
    degraded: results.filter(r => r.status === 'degraded').length,
    unhealthy: results.filter(r => r.status === 'unhealthy').length,
    unconfigured: results.filter(r => r.status === 'unconfigured').length
  };

  let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  const configuredServices = summary.total - summary.unconfigured;

  if (configuredServices > 0) {
    const healthyRatio = summary.healthy / configuredServices;
    if (healthyRatio < 0.5) {
      overall = 'unhealthy';
    } else if (healthyRatio < 0.9) {
      overall = 'degraded';
    }
  }

  return { overall, timestamp: new Date().toISOString(), services: results, summary };
}

export function getAvailableServices(): string[] {
  return serviceCheckers.map(s => s.name);
}
