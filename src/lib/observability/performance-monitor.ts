export type PerformanceMetricName =
  | "map.render"
  | "repository.operation"
  | "route.calculation";

export type PerformanceMetric = {
  name: PerformanceMetricName;
  durationMs: number;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  measuredAt: string;
};

export type PerformanceMonitor = {
  record(metric: PerformanceMetric): void;
};

const performanceMonitoringEnabled =
  process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === "true";

class NoopPerformanceMonitor implements PerformanceMonitor {
  record() {
    return;
  }
}

class BrowserConsolePerformanceMonitor implements PerformanceMonitor {
  record(metric: PerformanceMetric) {
    console.info("[Glasswell performance]", metric);
  }
}

export const performanceMonitor: PerformanceMonitor =
  performanceMonitoringEnabled
    ? new BrowserConsolePerformanceMonitor()
    : new NoopPerformanceMonitor();

export function measureSync<T>(
  name: PerformanceMetricName,
  metadata: PerformanceMetric["metadata"],
  operation: () => T,
) {
  const startedAt = now();

  try {
    return operation();
  } finally {
    recordTiming(name, startedAt, metadata);
  }
}

export async function measureAsync<T>(
  name: PerformanceMetricName,
  metadata: PerformanceMetric["metadata"],
  operation: () => Promise<T>,
) {
  const startedAt = now();

  try {
    return await operation();
  } finally {
    recordTiming(name, startedAt, metadata);
  }
}

export function recordTiming(
  name: PerformanceMetricName,
  startedAt: number,
  metadata?: PerformanceMetric["metadata"],
) {
  performanceMonitor.record({
    name,
    durationMs: Math.round((now() - startedAt) * 100) / 100,
    metadata,
    measuredAt: new Date().toISOString(),
  });
}

function now() {
  if (typeof performance !== "undefined") {
    return performance.now();
  }

  return Date.now();
}
