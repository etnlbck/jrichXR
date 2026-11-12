# Studio knobs for Arrive densify

**Issue:** Studio knobs for Arrive densify  
**Wave:** 2 · **Effort:** M  
**Depends on:** Harden Arrive (brand scan fields pattern)

## Goal

Artists can tune densify duration / scatter from Studio Placement (or Brand), persisted on publish.

## Approach

1. Add gallery or brand fields: `densifyMs`, `scatterFactor` (clamped); defaults from `REVEAL`.
2. AdminEditor Placement section controls (number + range).
3. `config.ts` → scene reads overrides instead of only constants.
4. Document that extreme values may hurt mobile.

## Files

`packages/experience` gallery/brand types, `AdminEditor.tsx`, `config.ts`, `scene.ts` / `reveal.ts`.

## Acceptance

- Changing densify duration in Studio changes Arrive on republish
- Invalid values clamp; defaults match current product feel
