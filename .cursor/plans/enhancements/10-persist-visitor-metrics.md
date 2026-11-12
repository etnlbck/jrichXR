# Persist visitor metrics beyond console

**Issue:** Persist visitor metrics beyond console  
**Wave:** 2 · **Effort:** M  
**Depends on:** Harden Arrive marks (so funnel events exist)

## Goal

Send key activation marks somewhere aggregatable for field tests (not only `console` / `window.__JRF_METRICS`).

## Approach

1. Keep local `mark()` API; add optional sink: `navigator.sendBeacon` to a lightweight `/api/metrics` **or** Vercel Analytics / custom events.
2. Events: `boot`, `first_target_found`, `reveal_start`, `reveal_complete`, `reveal_cancel` (+ ms where useful).
3. No PII; experience id + coarse device class only.
4. Feature-flag or env `NEXT_PUBLIC_METRICS=1` so prod can disable.

## Files

`metrics.ts`, new route or Analytics helper, call sites already using `mark`.

## Acceptance

- Field session produces queryable events (dashboard or log drain)
- Default local/dev still populates `__JRF_METRICS`
- Failures in sink never break AR
