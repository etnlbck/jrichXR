# Phase 3 — Aura Lenses native publish

## Goal

Same `experience.json` package on staff TestFlight: image marker → finished model → **hard-cut** to raw + overlay + narration → Flutter provenance sheet → **Shop this piece** → jrichforms `/shop`.

## Engineering status

- [x] `gallery` embedded on mural `experience` via `npm run prepare-lenses`
- [x] `publish-payload.json` + `npm run publish-lenses` (upload + `/v1/publish`)
- [x] USDZ workflow docs (`npm run convert-usdz` → `lenses/USDZ.md`)
- [x] Native hard-cut + `galleryMorph` / sheet contract (Aura Lenses mobile)
- [ ] Real `finished.usdz` / `raw.usdz` on disk (Reality Converter)
- [ ] Live publish against staging API (`AURA_LENSES_API_URL` + `PUBLISH_API_KEY`)
- [ ] Tracking twin + `.mind` ids written back (auto on marker upload when tools succeed)
- [ ] Staff TestFlight field check vs WebAR scale

## Commands

```bash
export GALLERY_PUBLIC_URL=https://your-jrichforms.vercel.app
npm run prepare-lenses
npm run convert-usdz          # exit 2 until Reality Converter exports exist
DRY_RUN=1 npm run publish-lenses
export AURA_LENSES_API_URL=https://…
export PUBLISH_API_KEY=…
npm run publish-lenses
npm run sync-content         # keep Vercel WebAR hashes aligned
```

## Native contract

| Piece | Behavior |
|-------|----------|
| Morph | `gallery.morph.nativeMode = hard-cut` — show/hide finished↔raw (no cross-fade) |
| Event | Native → Flutter `event` with `type: galleryMorph`, `nodeId: raw\|finished` |
| Sheet | After first enter `raw`, Flutter bottom sheet from `experience.gallery` |
| CTA | Opens `gallery.shop.shopUrl` in external browser (`url_launcher`) |

See [lenses/NATIVE_SHEET.md](lenses/NATIVE_SHEET.md) and [lenses/USDZ.md](lenses/USDZ.md).

## Tracking twin / MindAR

Marker upload with `kind=marker` runs twin + mind compile on the API. Confirm `marker.trackingAssetId` / `marker.mindAssetId` in `lenses/last-publish-body.json`. MindAR share remains secondary — [lenses/MINDAR.md](lenses/MINDAR.md).
