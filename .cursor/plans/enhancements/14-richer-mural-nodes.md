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

## Deferred

- video / audio / loop / proximity
- Extra gltf nodes beyond finished/raw morph pair

## Acceptance

- [x] Image node visible/interactive in WebAR from published JSON
- [x] Unsupported types stay honest in Studio
