# Dual-publish release checklist

Visitor WebAR = Vercel (`jrichforms-xr-poc`). Native / MindAR = Aura Lenses S3 after publish.

1. Bump `experience.json` → `version`
2. Update binaries under `content/untitled-no-7/assets/` (GLB &lt;10 MB each)
3. Measure printed placard → set `marker.physicalWidthM`
4. `npm run sync-content` then `npm run build` / deploy Vercel
5. `npm run prepare-lenses` — review `lenses/publish-payload.json`
6. Upload assets to Lenses; replace stub asset ids with returned ids
7. Generate tracking twin + `.mind` from the **same** print master; set `trackingAssetId` / `mindAssetId`
8. Set `extensions.gallery.shop.shopUrl` to production host
9. Publish mural to Lenses API / Labs
10. Staff TestFlight: verify hard-cut morph + provenance sheet → `/shop`
11. Record asset hashes / version in the release notes so both sides stay in sync
