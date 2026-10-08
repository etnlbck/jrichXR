# MindAR share path (secondary WebAR)

Primary gallery QR remains **jrichforms** (8th Wall). Aura `/w/:token` is optional secondary WebAR.

## Steps (Aura Lenses)

1. Use the same print master as `marker.web.printImage` / placard cropped PNG.  
2. Generate a tracking twin (`faithful` or `border`) via Lenses API `tracking_twin`.  
3. Compile `.mind` via Lenses `mind_compile`; store as `marker.mindAssetId`.  
4. Publish mural; create share token → `https://<lenses-web>/w/<token>`.  
5. Staff can print a second QR for MindAR demos; visitor wall QR should still point at jrichforms.

## Coordinate note

Eng meters → MindAR units via `@aura-lenses/eng` `muralMetersToTargetUnits` — do **not** apply the jrichforms XR8 remap on the MindAR path.
