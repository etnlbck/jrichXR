# Untitled No. 7 — shared gallery experience package

Portable eng-compatible mural package for:

1. **jrichforms WebAR** (8th Wall + Three) — primary visitor QR path  
2. **Aura Lenses native** (ARKit/ARCore) — staff/demo until app is public  
3. **Aura MindAR share** (`/w/:token`) — secondary WebAR  

## Layout

| Path | Purpose |
|------|---------|
| `experience.json` | Source of truth (mural nodes + `gallery` extension) |
| `assets/` | Canonical binaries before dual-publish |
| `lenses/` | Native sheet contract, MindAR notes, publish payload |
| `RELEASE.md` | Dual-publish checklist (Vercel ↔ Lenses S3) |

## Web asset sync

Runtime URLs live under `apps/web/public/assets/`. After updating `content/.../assets/`, run:

```bash
npm run sync-content
```

## Scale

Measure the **printed** placard width (meters) and set `marker.physicalWidthM`.  
Default `0.18` ≈ 18 cm merch card. Field-test with a ruler + photo (see Phase 2 checklist in BUILD-PLAN).

## Marker master

One print art: `apps/web/public/assets/targets/jrichforms-placard_cropped.png`.  
Phase 0–2: 8th Wall CLI JSON only. Phase 3–4: generate tracking twin + `.mind` from this same file.
