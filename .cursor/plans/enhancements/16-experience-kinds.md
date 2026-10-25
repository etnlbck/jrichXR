# Support additional experience kinds

**Issue:** Support additional experience kinds  
**Wave:** 3 · **Effort:** L · **Status:** stub — expand before build

## Goal

Data model and UI support at least one experience kind beyond mural/sculpture-shaped assumptions (morph, provenance, shop), matching the generic copy already shipped.

## Expand later

- Widen `kind` union in `@jrichforms/experience`
- Config/visitor forks: optional morph, optional provenance fields
- Studio create flow: choose kind
- Migration for existing mural experiences

## Acceptance (when expanded)

- New kind can be created, published, and visited without sculpture-only chrome
- Existing murals unchanged
