# Video, audio, loop, proximity + extra glTF nodes

**Issue:** Honor video/audio/loop/proximity nodes and extra glTF in WebAR  
**Wave:** 5 (deferred) · **Effort:** L · **Status:** planned  
**Depends on:** Image node slice ([14](14-richer-mural-nodes.md))  
**Pairs with:** Studio non-image authoring ([19](19-non-image-node-authoring.md))

## Goal

Extend visitor runtime beyond image planes so package node types/triggers that artists already model in eng JSON work in WebAR where feasible.

## Scope

### In

1. **`video` nodes** — marker-local plane + `HTMLVideoElement` / `VideoTexture`; `onDetect` autoplay (muted until unlock) and `tap` to play/reveal.
2. **`audio` nodes** — spatial or non-spatial; play on `onDetect` / `tap` after Begin unlock; reuse pin-audio patterns where possible.
3. **`loop` trigger** — restart video/audio when ended (or keep video looping via `loop` attribute).
4. **`proximity` trigger** — coarse distance from camera to node position (marker-local); enter/exit thresholds; document as approximate (not true SLAM proximity).
5. **Extra `model` / `gltf` nodes** — load additional GLBs parented to the marker (not the morph pair). Placement via existing `getNodeXr8Placement`. No morph/crossfade for these.

### Out

- Real world-scale proximity / geofencing
- iOS USDZ-only assets in WebAR (keep webPath GLB)
- Real 3DGS ([17](17-real-3dgs-pipeline.md))

## Approach

1. Widen `mediaImageNodes` → general `runtimeMediaNodes` / typed helpers in `@jrichforms/experience`.
2. Extend `AppConfig` with `videoNodes`, `audioNodes`, `extraModels` (or one discriminated list).
3. `scene.ts`: loaders for video planes, AudioListener/PositionalAudio or HTMLAudioElement, GLTFLoader for extras; dispose on teardown.
4. Trigger dispatcher: `onDetect` | `tap` | `loop` | `proximity` with honest Studio badges for anything still skipped.
5. Metrics: optional `mark('media_play')` — keep no-PII.

## Files

- [`packages/experience/src/helpers.ts`](../../../packages/experience/src/helpers.ts), [`types.ts`](../../../packages/experience/src/types.ts)
- [`apps/web/lib/config.ts`](../../../apps/web/lib/config.ts), [`scene.ts`](../../../apps/web/lib/scene.ts)
- [`ArExperience.tsx`](../../../apps/web/components/ArExperience.tsx) — tap order: pin → media → morph
- Studio badges in [`AdminEditor.tsx`](../../../apps/web/components/AdminEditor.tsx) (full authoring in #19)

## Acceptance

- [ ] Published video node plays (or reveals) under supported trigger
- [ ] Audio node plays after unlock without breaking narration
- [ ] Extra glTF appears at authored placement
- [ ] Proximity uses documented coarse threshold; fails soft if unsupported
- [ ] Unsupported combos remain badged in Studio
