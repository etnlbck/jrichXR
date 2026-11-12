/**
 * Lightweight field-test timing helpers.
 * Always logs to console and window.__JRF_METRICS.
 * When NEXT_PUBLIC_METRICS=1, beacons to /api/metrics and Vercel Analytics custom events.
 */
import { track } from '@vercel/analytics';

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
  'tracking_lost_post_reveal',
]);

export function setMetricsContext(next: { experienceId?: string }) {
  context = { ...context, ...next };
}

/** Coarse device class for field aggregation — no PII. */
export function deviceClass(): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
  if (typeof window === 'undefined' || !navigator) return 'unknown';
  try {
    const estimate = window.XR8?.XrDevice?.deviceEstimate?.();
    const raw = String(
      (estimate as { deviceClass?: string } | undefined)?.deviceClass ??
        (estimate as { class?: string } | undefined)?.class ??
        ''
    ).toLowerCase();
    if (raw.includes('phone') || raw.includes('mobile')) return 'mobile';
    if (raw.includes('tablet') || raw.includes('pad')) return 'tablet';
    if (raw.includes('desktop') || raw.includes('pc')) return 'desktop';
  } catch {
    /* ignore */
  }
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/mobi|iphone|android/.test(ua)) return 'mobile';
  if (/macintosh|windows|linux/.test(ua)) return 'desktop';
  return 'unknown';
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
  const cls = deviceClass();
  try {
    track(`jrf_${name}`, {
      ms,
      experienceId: context.experienceId ?? '',
      deviceClass: cls,
    });
  } catch {
    /* Analytics may be unavailable offline */
  }
  try {
    const payload = JSON.stringify({
      name,
      ms,
      experienceId: context.experienceId ?? null,
      deviceClass: cls,
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
