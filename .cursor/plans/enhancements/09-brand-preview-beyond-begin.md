# Brand preview beyond Begin gate

**Issue:** Brand preview beyond Begin gate  
**Wave:** 2 · **Effort:** M  
**Depends on:** none (pairs with Arrive knobs)

## Goal

Brand/Studio preview shows more than the Begin gate—at least pin color, loading, and a static “after Arrive” chrome mock (prompt + About). Densify preview can be a simplified animation or scrubber later.

## Approach

1. Extend `BrandFields` preview panel with tabs or steps: Gate | Loading | Anchored chrome.
2. Anchored mock: fake reticle success optional; show prompt + About with brand vars.
3. Pin color swatch in context of a dimmed model silhouette (CSS), not full WebGL unless cheap.
4. Keep preview client-only; no XR8.

## Files

`BrandFields.tsx`, `BrandEditor.tsx`, `ArExperience.module.css` (shared tokens).

## Acceptance

- Artist can preview gate, loading, and anchored chrome without publishing
- Brand accent/logo/font reflect in each step
