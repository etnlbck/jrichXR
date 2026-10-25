/** Shared timings for visitor activation reveal (UI + 3D). */

export const REVEAL = {
  gateFadeMs: 280,
  overlayFadeMs: 320,
  reticleSuccessMs: 380,
  /** Require continuous lock before densify starts (reduces flicker false-starts). */
  stableLockMs: 140,
  densifyMs: 1000,
  /** Stage / reduced-motion opacity-only fade. */
  shortFadeMs: 180,
  /** Max points sampled from the finished mesh. */
  pointBudget: 2200,
  /** Initial scatter radius as a fraction of model bounding-sphere radius. */
  scatterFactor: 0.55,
} as const;

export type RevealState = 'idle' | 'waiting' | 'playing' | 'done';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
