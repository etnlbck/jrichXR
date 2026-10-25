# Honor richer mural node types in WebAR

**Issue:** Honor richer mural node types in WebAR  
**Wave:** 3 · **Effort:** L · **Status:** stub — expand before build

## Goal

Visitor runtime honors more package node types/triggers (image/video/audio/gltf + onDetect/tap/loop/proximity) beyond finished/raw + overlay + pins.

## Expand later

- Inventory package node schema vs `scene.ts` behavior
- Prioritize 1–2 node types for a vertical slice (e.g. image plane + tap)
- Studio Nodes authoring is a separate issue (15)
- Document permanent WebAR gaps

## Acceptance (when expanded)

- At least one new node type visible/interactive in WebAR from published JSON
- Unsupported types stay honest in Studio (badges)
