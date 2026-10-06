/**
 * Lightweight field-test / Milestone 4 timing helpers.
 * Values are logged to the console; also exposed on window for quick inspection.
 */
type MetricMap = Record<string, number>;

const metrics: MetricMap = {};
let t0 = 0;

export function metricsStart(label = 'session') {
  t0 = performance.now();
  metrics[`${label}_start`] = t0;
  mark('boot');
}

export function mark(name: string) {
  const now = performance.now();
  metrics[name] = now;
  metrics[`${name}_ms`] = Math.round(now - t0);
  if (typeof window !== 'undefined') {
    (window as unknown as { __JRF_METRICS?: MetricMap }).__JRF_METRICS = {
      ...metrics,
    };
  }
  console.info(`[jrf-metrics] ${name}: ${metrics[`${name}_ms`]}ms`);
}

export function getMetrics() {
  return { ...metrics };
}
