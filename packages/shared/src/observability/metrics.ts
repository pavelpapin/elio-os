/**
 * Metrics Collection
 * In-memory metrics for workflow observability
 */

export interface MetricPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

export interface Counter {
  inc(labels?: Record<string, string>): void;
  get(labels?: Record<string, string>): number;
}

export interface Gauge {
  set(value: number, labels?: Record<string, string>): void;
  inc(labels?: Record<string, string>): void;
  dec(labels?: Record<string, string>): void;
  get(labels?: Record<string, string>): number;
}

export interface Histogram {
  observe(value: number, labels?: Record<string, string>): void;
  getCount(labels?: Record<string, string>): number;
  getSum(labels?: Record<string, string>): number;
  getAvg(labels?: Record<string, string>): number;
}

// Storage
const counters = new Map<string, Map<string, number>>();
const gauges = new Map<string, Map<string, number>>();
const histograms = new Map<string, Map<string, { count: number; sum: number }>>();

function labelKey(labels?: Record<string, string>): string {
  if (!labels) return '__default__';
  return Object.entries(labels).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`).join(',');
}

export function createCounter(name: string): Counter {
  if (!counters.has(name)) counters.set(name, new Map());
  const store = counters.get(name)!;

  return {
    inc(labels?: Record<string, string>) {
      const key = labelKey(labels);
      store.set(key, (store.get(key) ?? 0) + 1);
    },
    get(labels?: Record<string, string>) {
      return store.get(labelKey(labels)) ?? 0;
    },
  };
}

export function createGauge(name: string): Gauge {
  if (!gauges.has(name)) gauges.set(name, new Map());
  const store = gauges.get(name)!;

  return {
    set(value: number, labels?: Record<string, string>) {
      store.set(labelKey(labels), value);
    },
    inc(labels?: Record<string, string>) {
      const key = labelKey(labels);
      store.set(key, (store.get(key) ?? 0) + 1);
    },
    dec(labels?: Record<string, string>) {
      const key = labelKey(labels);
      store.set(key, (store.get(key) ?? 0) - 1);
    },
    get(labels?: Record<string, string>) {
      return store.get(labelKey(labels)) ?? 0;
    },
  };
}

export function createHistogram(name: string): Histogram {
  if (!histograms.has(name)) histograms.set(name, new Map());
  const store = histograms.get(name)!;

  return {
    observe(value: number, labels?: Record<string, string>) {
      const key = labelKey(labels);
      const current = store.get(key) ?? { count: 0, sum: 0 };
      store.set(key, { count: current.count + 1, sum: current.sum + value });
    },
    getCount(labels?: Record<string, string>) {
      return store.get(labelKey(labels))?.count ?? 0;
    },
    getSum(labels?: Record<string, string>) {
      return store.get(labelKey(labels))?.sum ?? 0;
    },
    getAvg(labels?: Record<string, string>) {
      const data = store.get(labelKey(labels));
      if (!data || data.count === 0) return 0;
      return data.sum / data.count;
    },
  };
}

// Pre-defined metrics for workflows
export const workflowMetrics = {
  runsTotal: createCounter('workflow_runs_total'),
  runsActive: createGauge('workflow_runs_active'),
  runDuration: createHistogram('workflow_run_duration_ms'),
  stagesDuration: createHistogram('workflow_stage_duration_ms'),
  stagesErrors: createCounter('workflow_stage_errors_total'),
  apiCallsTotal: createCounter('api_calls_total'),
  apiCallErrors: createCounter('api_call_errors_total'),
  rateLimitHits: createCounter('rate_limit_hits_total'),
  circuitBreakerTrips: createCounter('circuit_breaker_trips_total'),
};

/**
 * Get all metrics as a formatted object for export
 */
export function getAllMetrics(): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  counters.forEach((store, name) => {
    result[name] = Object.fromEntries(store);
  });
  gauges.forEach((store, name) => {
    result[name] = Object.fromEntries(store);
  });
  histograms.forEach((store, name) => {
    result[name] = Object.fromEntries(
      Array.from(store.entries()).map(([k, v]) => [k, { ...v, avg: v.count > 0 ? v.sum / v.count : 0 }])
    );
  });

  return result;
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  counters.clear();
  gauges.clear();
  histograms.clear();
}
