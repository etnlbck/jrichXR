# Studio badges for unsupported AR features

**Issue:** Studio badges for unsupported AR features  
**Wave:** 1 · **Effort:** S  
**Depends on:** none  
**Unlocks:** clearer artist expectations

## Goal

Surface honest “not in WebAR yet” (or similar) badges for capabilities that exist in the package/types but are not honored by the visitor runtime.

## Files

- [`packages/experience/src/types.ts`](../../../packages/experience/src/types.ts) — `personOcclusion` and related
- [`apps/web/components/AdminEditor.tsx`](../../../apps/web/components/AdminEditor.tsx) — placement / advanced section
- Grep Studio for any toggles that imply occlusion / world tracking / extra node triggers

## Steps

1. Inventory typed or UI-exposed flags that WebAR ignores (start with `personOcclusion`; note mural triggers beyond tap/morph if shown).
2. If a control exists, add a small badge/helper: “WebAR: not supported yet”.
3. If no control exists but field is in JSON/nodes inspect, show badge on Nodes or Placement advanced panel listing unsupported flags present in the experience.
4. Do not implement the AR features in this issue.

## Acceptance

- [ ] Artist can see at least one clear unsupported indicator when relevant data is present
- [ ] No false claim that occlusion/world features run in WebAR
- [ ] Copy is short and Studio-consistent

## Notes

Keep badge visual quiet (status text, not a new card system). Expand inventory in Wave 3 mural-nodes plan.
