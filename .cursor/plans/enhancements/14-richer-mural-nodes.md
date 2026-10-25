# Honor richer mural node types in WebAR

**Issue:** Honor richer mural node types in WebAR  
**Wave:** 3 · **Effort:** L · **Status:** done (image vertical slice)

## Goal

Visitor runtime honors image nodes (beyond finished/raw + morph overlay + pins).

## Shipped

- `mediaImageNodes()` in `@jrichforms/experience` (image nodes except `overlay`)
- `AppConfig.mediaNodes` + `createScene` plane load / tap reveal
- Triggers: `onDetect` (visible on lock), `tap` (opacity 0 until tapped)
- Studio badges: image supported; video/audio still unsupported

## Deferred → Wave 5 plans

- video / audio / loop / proximity + extra glTF → [18](18-video-audio-proximity-nodes.md)
- Studio authoring for those types → [19](19-non-image-node-authoring.md)

## Acceptance

- [x] Image node visible/interactive in WebAR from published JSON
- [x] Unsupported types stay honest in Studio
