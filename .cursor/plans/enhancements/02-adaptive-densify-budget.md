# Device-adaptive densify point budget

**Issue:** Device-adaptive densify point budget  
**Wave:** 1 · **Effort:** M  
**Depends on:** Harden Arrive (nice-to-have for shared reveal constants; can ship alone)  
**Unlocks:** densify polish on mid-range phones

## Goal

Scale reveal `pointBudget` from XR8 device estimate so low/mid phones stay smooth while high-end keeps density.

## Files

- [`apps/web/lib/reveal.ts`](../../../apps/web/lib/reveal.ts) — budget tiers / helper `revealPointBudget()`
- [`apps/web/lib/scene.ts`](../../../apps/web/lib/scene.ts) — call helper when `buildRevealCloud` runs (after XR ready when possible)
- [`apps/web/lib/types.ts`](../../../apps/web/lib/types.ts) — `XrDevice.deviceEstimate` already typed
- [`apps/web/lib/xr-boot.ts`](../../../apps/web/lib/xr-boot.ts) — optional: stash estimate once for scene

## Steps

1. Define tiers in `reveal.ts`, e.g. low ~800, mid ~1500, high ~2200 (current), with floor/ceiling.
2. Resolve tier from `XR8.XrDevice.deviceEstimate()` when available (os/model heuristics: older iPhone / low-end Android → low). Fall back to mid if XR8 not ready yet at cloud build time.
3. If cloud is built before XR boot (stage / early load), rebuild cloud once at first `beginReveal` if estimate differs, **or** build cloud lazily on first reveal start (preferred: defer `buildRevealCloud` until `beginReveal` so estimate exists on phone).
4. Log chosen budget via `mark` or `console.info` for field tests.

## Acceptance

- [ ] Stage still densifies (fallback budget)
- [ ] Phone path uses a non-fixed budget when `deviceEstimate` exists
- [ ] Densify completes without obvious jank on a mid Android target (manual)
- [ ] Reduced-motion still skips cloud

## Notes

Prefer lazy cloud build on reveal start over double-building. Do not change densify duration here.
