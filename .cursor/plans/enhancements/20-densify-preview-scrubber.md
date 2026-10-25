# Densify preview scrubber in Brand

**Issue:** Densify preview scrubber in Brand preview  
**Wave:** 5 (deferred) · **Effort:** M · **Status:** planned  
**Depends on:** Brand tabs Gate | Loading | Anchored ([09](09-brand-preview-beyond-begin.md)); Arrive knobs ([08](08-studio-arrive-knobs.md))

## Goal

Artists can preview Arrive densify timing/look in Studio without publishing or running XR8—via a simplified animation or scrubber driven by gallery `reveal` knobs.

## Scope

### In

1. New Brand preview step/tab: **Arrive** (or sub-panel under Anchored).
2. Lightweight canvas or CSS/WebGL point-cloud mock using brand accent + `densifyMs` / `scatterFactor`.
3. **Scrubber** (0→1) and/or Play once; honor `prefers-reduced-motion` (opacity-only).
4. Live binding to Placement/Brand densify inputs already persisted on `gallery.reveal`.

### Out

- Full Three scene with finished GLB sampling (unless already cheap in pin placer)
- True 3DGS preview ([17](17-real-3dgs-pipeline.md))

## Approach

1. Extract a tiny `DensifyPreview` client component (no XR8).
2. Sample a procedural sphere / low-poly stand-in if GLB preview is too heavy; optional later: reuse pin-placer finished URL.
3. Map scrub position through the same easing as visitor `updateReveal` (document if approximate).
4. Do not load XR8 or camera permissions.

## Files

- [`BrandFields.tsx`](../../../apps/web/components/BrandFields.tsx) (or Brand editor sibling)
- Shared reveal constants from [`reveal.ts`](../../../apps/web/lib/reveal.ts)

## Acceptance

- [ ] Artist scrubs or plays densify preview and sees accent + timing change with knobs
- [ ] Reduced-motion path is non-jarring
- [ ] Preview never requires a device camera
