/** Shared timings for visitor activation reveal (UI + 3D). */

export const REVEAL = {
  gateFadeMs: 280,
  overlayFadeMs: 320,
  reticleSuccessMs: 380,
  /** Require continuous lock before densify starts (reduces flicker false-starts). */
  stableLockMs: 140,
  /**
   * After target lost during waiting/playing, wait this long before canceling.
   * Brief flicker mid-densify should not reset Arrive.
   */
  trackingGraceMs: 320,
  /**
   * After Arrive is done, fade the piece out over this duration when tracking
   * drops, instead of an instant cut to scanning.
   */
  postRevealFadeMs: 480,
  densifyMs: 1000,
  /** Stage / reduced-motion opacity-only fade. */
  shortFadeMs: 180,
  /** Max points sampled from the finished mesh. */
  pointBudget: 2200,
  /** Low / mid / high budgets for device-adaptive densify. */
  pointBudgetLow: 800,
  pointBudgetMid: 1500,
  pointBudgetHigh: 2200,
  /** Initial scatter radius as a fraction of model bounding-sphere radius. */
  scatterFactor: 0.55,
} as const;

export type RevealState = 'idle' | 'waiting' | 'playing' | 'done';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Point budget for densify cloud. Uses XR8 deviceEstimate when available.
 * Stage / unknown → mid.
 */
export function revealPointBudget(): number {
  try {
    const estimate = window.XR8?.XrDevice?.deviceEstimate?.();
    if (!estimate) return REVEAL.pointBudgetMid;
    const model = String(estimate.model ?? '').toLowerCase();
    const os = String(estimate.os ?? '').toLowerCase();

    // Older / entry phones — keep densify light.
    const lowHints = [
      'iphone 8',
      'iphone 7',
      'iphone 6',
      'iphone se',
      'ipod',
      'galaxy a0',
      'galaxy a1',
      'galaxy j',
      'redmi',
      'moto e',
      'moto g play',
    ];
    if (lowHints.some((h) => model.includes(h))) return REVEAL.pointBudgetLow;

    // Recent flagships — full density.
    const highHints = [
      'iphone 1',
      'iphone 16',
      'iphone 15',
      'iphone 14',
      'iphone 13',
      'iphone 12',
      'iphone 11',
      'pixel 8',
      'pixel 7',
      'pixel 6',
      'galaxy s2',
      'galaxy s1',
      'galaxy z',
    ];
    if (highHints.some((h) => model.includes(h))) return REVEAL.pointBudgetHigh;

    if (os === 'ios' || os === 'android') return REVEAL.pointBudgetMid;
  } catch {
    /* XR8 not ready */
  }
  return REVEAL.pointBudgetMid;
}
