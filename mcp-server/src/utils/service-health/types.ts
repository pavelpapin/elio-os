/**
 * Service Health Types
 */

export interface ServiceHealthResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unconfigured';
  latency_ms?: number;
  message?: string;
  last_check: string;
}

export interface AllServicesHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: ServiceHealthResult[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unconfigured: number;
  };
}

export interface ServiceChecker {
  name: string;
  check: () => Promise<ServiceHealthResult>;
}
