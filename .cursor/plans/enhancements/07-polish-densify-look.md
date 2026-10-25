# Polish densify look (splat-feel)

**Issue:** Polish densify look (splat-feel)  
**Wave:** 2 · **Effort:** M–L  
**Depends on:** Wave 1 Arrive harden / adaptive budget (recommended)

## Goal

Make Path A densify read as luminous materialization, not scatter dots.

## Approach

1. Tune `PointsMaterial`: size curve, opacity falloff, brand `accentFrom`/`accentTo` mix over time.
2. Soften scatter distribution (more surface-biased than sphere noise).
3. Optional sprite/atlas soft disc instead of square points (Three r128 limits).
4. Park true GPU splat shaders / 3DGS for Wave 3 parked plan.

## Files

`scene.ts` (`buildRevealCloud`, `updateReveal`), `reveal.ts` timings, brand colors via `config.brand`.

## Acceptance

- Densify reads as coalescing into the form on stage and phone
- Mid-range phone stays acceptable with adaptive budget
- Reduced-motion still skips cloud
