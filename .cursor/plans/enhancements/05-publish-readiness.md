# Publish readiness warnings (placeholder/interim)

**Issue:** Publish readiness warnings (placeholder/interim)  
**Wave:** 1 · **Effort:** S  
**Depends on:** none  
**Unlocks:** fewer accidental stand-in publishes

## Goal

Warn (soft-block with confirm) when publishing with placeholder cube or interim raw assets.

## Files

- [`apps/web/components/AdminEditor.tsx`](../../../apps/web/components/AdminEditor.tsx) — `publish()` guard
- Possibly list view if publish exists elsewhere (grep `api/admin/publish`)

## Steps

1. Before `fetch` publish, detect:
   - `experience.gallery.usePlaceholderCube === true`
   - finished asset missing / using cube path
   - `experience.assets['raw-glb']?.interim === true` (or config equivalent)
2. Show confirm dialog listing issues, e.g. “Publishing with placeholder cube and interim raw. Continue?”
3. Cancel aborts; OK proceeds with existing publish.
4. Optional: persistent status banner in editor when draft is “not ready” (non-blocking).

## Acceptance

- [ ] Publish with placeholder prompts confirm; cancel does not publish
- [ ] Clean draft publishes without extra confirm
- [ ] Interim raw alone also prompts

## Notes

Soft-block only (confirm), not hard 403 on API—artists may intentionally ship interim for field tests.

## Follow-up

Persistent banner + hard block with override → [21](21-hard-publish-readiness.md).
