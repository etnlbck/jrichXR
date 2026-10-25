# Harden and instrument Arrive reveal

**Issue:** Harden and instrument Arrive reveal  
**Wave:** 1 · **Effort:** M  
**Depends on:** none  
**Unlocks:** adaptive densify budget, densify polish, metrics persistence

## Goal

Make first-lock Arrive measurable and resilient: funnel marks, short tracking grace so flicker does not abort densify, brandable scan copy.

## Files

- [`apps/web/lib/metrics.ts`](../../../apps/web/lib/metrics.ts) — extend marks / optional duration helper
- [`apps/web/lib/reveal.ts`](../../../apps/web/lib/reveal.ts) — `trackingGraceMs` constant
- [`apps/web/lib/scene.ts`](../../../apps/web/lib/scene.ts) — mark + grace on lost; don’t cancel until grace expires
- [`apps/web/components/ArExperience.tsx`](../../../apps/web/components/ArExperience.tsx) — scan / “Found” strings from brand
- [`packages/experience/src/brand.ts`](../../../packages/experience/src/brand.ts) — `scanText` / `scanFoundText` (or reuse `beginText` for scan only)
- [`apps/web/components/BrandFields.tsx`](../../../apps/web/components/BrandFields.tsx) — Studio fields
- [`apps/web/lib/config.ts`](../../../apps/web/lib/config.ts) — wire resolved brand into AppConfig

## Steps

1. **Marks:** On `beginReveal` → `mark('reveal_start')`; on `completeReveal` → `mark('reveal_complete')` + store `reveal_complete_ms` from start; on cancel after playing/waiting → `mark('reveal_cancel')`. Keep existing `first_target_found`.
2. **Tracking grace:** Add `REVEAL.trackingGraceMs` (~250–400). On `onImageLost` while `waiting|playing`, start a timer; only `cancelReveal` if still lost when it fires. On `onImageFound` during grace, clear timer and continue.
3. **Scan copy:** Add brand fields `scanText` (default “Aim at the marker…”) and `scanFoundText` (default “Found”); resolve like `beginText`; replace hard-coded strings in `ArExperience`.
4. **Studio:** Two short text fields next to begin/loading in BrandFields; publish path already snapshots brand.

## Acceptance

- [ ] `__JRF_METRICS` shows `reveal_start` / `reveal_complete` (or `reveal_cancel`) on Arrive
- [ ] Brief target flicker mid-densify does not reset to scan
- [ ] Sustained lost still returns to scan and allows retry
- [ ] Brand scan strings appear on phone path; stage unchanged
- [ ] `prefers-reduced-motion` path still marks complete

## Notes

Keep adaptive `pointBudget` out of this plan (separate Wave 1 issue). Grace must not leave invisible solid stuck if cancel eventually fires.
