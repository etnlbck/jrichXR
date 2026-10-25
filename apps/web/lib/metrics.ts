/**
 * Lightweight field-test timing helpers.
 * Always logs to console and window.__JRF_METRICS.
 * When NEXT_PUBLIC_METRICS=1, also beacons to /api/metrics (no PII).
 */
type MetricMap = Record<string, number>;

const metrics: MetricMap = {};
let t0 = 0;
let context: { experienceId?: string } = {};

const BEACON_NAMES = new Set([
  'boot',
  'first_target_found',
  'reveal_start',
  'reveal_complete',
  'reveal_cancel',
]);

export function setMetricsContext(next: { experienceId?: string }) {
  context = { ...context, ...next };
}

export function metricsStart(label = 'session') {
  t0 = performance.now();
  metrics[`${label}_start`] = t0;
  mark('boot');
}

export function mark(name: string) {
  const now = performance.now();
  metrics[name] = now;
  const ms = Math.round(now - t0);
  metrics[`${name}_ms`] = ms;
  if (typeof window !== 'undefined') {
    (window as unknown as { __JRF_METRICS?: MetricMap }).__JRF_METRICS = {
      ...metrics,
    };
  }
  console.info(`[jrf-metrics] ${name}: ${ms}ms`);
  maybeBeacon(name, ms);
}

function maybeBeacon(name: string, ms: number) {
  if (typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_METRICS !== '1') return;
  if (!BEACON_NAMES.has(name)) return;
  try {
    const payload = JSON.stringify({
      name,
      ms,
      experienceId: context.experienceId ?? null,
      t: Date.now(),
    });
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/metrics', blob);
    } else {
      void fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        /* never break AR */
      });
    }
  } catch {
    /* never break AR */
  }
}

export function getMetrics() {
  return { ...metrics };
}
