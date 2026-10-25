# Real 3D Gaussian splat pipeline (parked)

**Issue:** Real 3D Gaussian splat pipeline (parked)  
**Wave:** 3 · **Effort:** L · **Status:** parked stub — not next polish

## Goal

True 3DGS assets for Arrive (or as piece representation), with mobile fallback to Path A densify.

## Why parked

- Three is pinned at `^0.128.0`; modern splat loaders need a newer Three + XR8 compatibility spike
- New asset type, Studio upload, Blob/publish, device fallback

## Expand later (spike order)

1. Three upgrade cost vs 8th Wall
2. Choose format (`.splat` / `.ply` / `.spz`) and loader
3. Anchor scale match to image target
4. Studio field + publish
5. Fallback to Path A when unsupported

## Acceptance (when expanded)

- Optional splat reveal or piece on a supported device
- Unsupported devices use Path A densify without crash
