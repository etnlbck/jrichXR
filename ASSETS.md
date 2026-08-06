# Assets capture checklist

Run these in parallel with engineering Milestone 0. Drop finished files into the matching `public/assets/*` folders.

## 1. Image target (unblocks M0)

- [ ] Design / photograph a **high-contrast, matte**, feature-rich placard or card (not the obsidian).
- [ ] Generate metadata:

```bash
# Interactive:
npx @8thwall/image-target-cli@latest

# Or regenerate the committed test target:
node scripts/make-test-target.mjs
```

- [ ] Place JSON + images under `public/assets/targets/`.
- [ ] Ensure `imagePath` in the JSON is an absolute public URL, e.g. `/assets/targets/<name>_luminance.png`.
- [ ] Print matte, ~15–20 cm, mount beside the piece. QR points at the Vercel URL.

## 2. Photogrammetry (unblocks M1–M2) — highest risk

- [ ] Capture **finished** polished piece (cross-polarized light or temporary dulling spray).
- [ ] Capture **raw** guide-marked stone (or re-texture finished mesh for a faster POC).
- [ ] Decimate each mesh to &lt; ~100k tris, &lt; ~10 MB; prefer Draco/meshopt.
- [ ] In Blender: **shared origin, up-axis, and scale** for finished + raw.
- [ ] Export `finished.glb` → `public/assets/models/finished.glb`
- [ ] Export `raw.glb` → `public/assets/models/raw.glb`
- [ ] Set `usePlaceholderCube: false` in `lib/config.ts`.

## 3. Guide-mark overlay (M2)

- [ ] Run a sculpture photo through [aglitch.art](https://aglitch.art) → SVG → transparent PNG.
- [ ] Drop as `public/assets/overlays/guide-marks.png`.

## 4. Narration + provenance (M3)

- [ ] Record artist narration (~30–60s), export mono MP3 ~96 kbps → `public/assets/audio/narration.mp3`.
- [ ] Fill `piece.dimensions`, `piece.year`, `piece.exhibition`, `piece.acquireUrl` in `lib/config.ts`.

## 5. Field test (M4)

- [ ] Deploy to Vercel; print QR to the production URL.
- [ ] Test on 3+ devices (include an older iPhone).
- [ ] Check `window.__JRF_METRICS` for `first_target_found_ms` and model load times.
- [ ] Tune `placement` under gallery lighting.
