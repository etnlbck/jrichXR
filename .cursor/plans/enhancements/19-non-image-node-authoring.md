# Studio authoring for non-image node types

**Issue:** Nodes authoring beyond image (video/audio/extra model)  
**Wave:** 5 (deferred) · **Effort:** M–L · **Status:** planned  
**Depends on:** Runtime support for those types ([18](18-video-audio-proximity-nodes.md)) — or ship inspect-only first with badges

## Goal

Studio Nodes tab can add/remove/configure WebAR-supported node types, not only image planes and locked morph nodes.

## Scope

### In

1. **Add node** flow: type picker constrained to WebAR-supported set (`image` | `video` | `audio` | `model` extra — not locked finished/raw/overlay).
2. **Trigger** select expanded to runtime-supported set (`onDetect` | `tap` | `loop` | `proximity` when #18 lands).
3. **Per-type upload** — video (mp4), audio (mp3), glb; reuse upload + `applyAssetUrl`.
4. **Remove** non-locked nodes (already for image).
5. Validation: missing asset → publish readiness note (ties to [21](21-hard-publish-readiness.md)).

### Out

- Editing eng-only fields that WebAR ignores (`platforms`, `androidAssetId`) as if live — keep badges
- Full timeline / sequencer UI

## Approach

1. Replace `addImageNode` with `addNode(type)` + shared id scheme (`video-1`, `audio-1`, `prop-1`).
2. Type-specific accept strings and copy in Nodes panel.
3. Gate “Add video/audio/model” behind runtime feature flags or version check so Studio never promises what visitor can’t play.
4. Persist through existing draft/publish; no schema migration beyond new asset roles.

## Files

- [`apps/web/components/AdminEditor.tsx`](../../../apps/web/components/AdminEditor.tsx)
- Upload route already accepts arbitrary asset ids
- Optional readiness helpers shared with publish

## Acceptance

- [ ] Artist can add a supported non-image node, upload asset, set trigger, publish
- [ ] Visitor sees/hears it when #18 is live
- [ ] Locked morph nodes stay non-removable / type-locked
