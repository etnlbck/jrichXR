# Assets capture checklist

Canonical files live under [`content/untitled-no-7/assets/`](content/untitled-no-7/assets/).  
Runtime copies sync to `apps/web/public/assets/` via `npm run sync-content` (also on `postinstall`).

Flags and paths are in [`content/untitled-no-7/experience.json`](content/untitled-no-7/experience.json) — not `apps/web/lib/config.ts` (that file is derived from the package + `@jrichforms/experience`).

## 1. Image target (unblocks WebAR)

- [x] Test placard committed under `apps/web/public/assets/targets/`.
- [ ] Design final **high-contrast, matte**, feature-rich placard (not the obsidian).
- [ ] Regenerate if art changes:

```bash
npm run make-target
# or: npx @8thwall/image-target-cli@latest
```

- [ ] Print matte, measure width → set `marker.physicalWidthM` (see [PHASE2.md](content/untitled-no-7/PHASE2.md)).
- [ ] QR points at the Vercel URL.

## 2. Photogrammetry / Meshy (morph pair)

- [x] `finished.glb` (Draco, &lt;10 MB) from Meshy Ebon Flow OBJ.
- [ ] Capture / export **raw** guide-marked stone with **shared origin, up-axis, scale**.
- [ ] Replace interim `raw.glb`; clear `"interim": true`.
- [ ] Decimate &lt; ~100k tris; `npm run check-assets`.

```bash
npm run convert-meshy -- path/to/model.obj
npx @gltf-transform/cli optimize content/untitled-no-7/assets/models/finished.glb \
  content/untitled-no-7/assets/models/finished.glb --compress draco
npm run sync-content
```

## 3. Guide-mark overlay

- [x] Placeholder `guide-marks.png` in content + `apps/web/public`.
- [ ] Optional: sculpture photo → [aglitch.art](https://aglitch.art) → replace PNG.

## 4. Narration + provenance

- [ ] Record artist narration (~30–60s), mono MP3 ~96 kbps → `content/.../audio/narration.mp3`.
- [ ] Clear `"interim": true` on narration asset.
- [ ] Fill `gallery.provenance` dimensions / year / exhibition in `experience.json`.

## 5. Field test

- [ ] `npm run check-assets`
- [ ] Deploy Vercel; print QR + marker.
- [ ] Scale checklist in [PHASE2.md](content/untitled-no-7/PHASE2.md).
- [ ] 3+ devices; inspect `window.__JRF_METRICS`.
- [ ] Tune node `position` / `scale` under gallery lighting.
