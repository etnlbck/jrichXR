# Hard publish block and readiness banner

**Issue:** Hard publish readiness (banner + optional API block)  
**Wave:** 5 (deferred) · **Effort:** S–M · **Status:** planned  
**Depends on:** Soft confirm ([05](05-publish-readiness.md))

## Goal

Make “not ready to publish” visible continuously in Studio, and optionally hard-block publish for severe stand-ins—while keeping an escape hatch for intentional field-test ships.

## Scope

### In

1. **Persistent readiness banner** on editor (overview + sticky near Publish): lists placeholder cube, interim raw/narration, missing image-node assets, missing pin media if referenced.
2. **Severity levels** — warn (confirm) vs block (must fix or explicit override).
3. **Override** — checkbox “I understand — publish interim anyway” stored only for the session (or one-shot confirm phrase), not a permanent package flag unless product wants it.
4. Optional **API soft-check** on publish route: return `409 readiness` with codes; Studio already gated — API is belt-and-suspenders for non-UI clients.

### Out

- CI content lint across all experiences
- Auto-fixing interim assets

## Approach

1. Extract `getPublishReadiness(experience) → { level, items[] }` shared by UI + API.
2. Banner uses same helper; Publish button disabled when `level === 'block'` until override.
3. Keep current confirm for `warn` level.
4. Document which checks are warn vs block (default: placeholder cube = warn; missing required finished GLB = block).

## Files

- New `apps/web/lib/publish-readiness.ts`
- [`AdminEditor.tsx`](../../../apps/web/components/AdminEditor.tsx)
- Publish API under `apps/web/app/api/admin/`

## Acceptance

- [ ] Banner visible whenever draft has readiness issues
- [ ] Block-level issues prevent publish without explicit override
- [ ] Clean drafts show no banner and publish unchanged
