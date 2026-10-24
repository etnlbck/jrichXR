# Phase 2 — field assets & scale checklist

## Engineering status

- [x] Draco `finished.glb` &lt; 10 MB  
- [x] `raw.glb` present (interim = duplicate + cool tint until true raw)  
- [x] Overlay `guide-marks.png`  
- [x] `usePlaceholderCube: false`  
- [x] `npm run check-assets`  
- [ ] True aligned **raw** stone GLB (shared origin/scale with finished)  
- [ ] Real artist **narration.mp3** (clear `assets.narration.interim`)  
- [ ] Measured `marker.physicalWidthM` from printed placard  
- [ ] Gallery lighting field test (3+ devices)

## Scale checklist (do this with a print)

1. Print `/marker` on **matte** paper.  
2. Measure the printed target **width** in centimeters (edge to edge of the image).  
3. Set `marker.physicalWidthM` in `experience.json` (= cm / 100). Default is `0.18` (18 cm).  
4. Deploy / run WebAR; place a ruler beside the physical sculpture.  
5. Photo: does the anchored 3D match the real piece size?  
6. Tune finished/raw `nodes[].scale` (fraction of marker width) and `position` if needed.  
7. Re-run when Aura native lands (Phase 3) and compare web vs app.

## Commands

```bash
npm run check-assets
npm run sync-content
npm run convert-meshy -- path/to/raw.obj   # then rename/optimize as raw.glb
```

After replacing interim files, remove `"interim": true` from those asset entries and bump `version`.
