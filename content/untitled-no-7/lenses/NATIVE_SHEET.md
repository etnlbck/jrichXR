# Aura Lenses — native provenance + Shop sheet

**Locked decision (10B):** After first morph to raw (or an explicit Done control), show an in-app Flutter bottom sheet.

## Content source

`experience.json` → `gallery`.

`npm run prepare-lenses` embeds the same bag on `publish-payload.json` → `experience.gallery` (and mirrors `extensions.gallery`).

Resolved shop link:

`experience.gallery.shop.shopUrl` = `GALLERY_PUBLIC_URL` + `gallery.shop.shopPath`

## Sheet fields

- Title, material, dimensions, year, exhibition  
- Primary CTA: **Shop this piece** → opens `shopUrl` (system browser)  
- Secondary: dismiss / return to AR  
- Info control on the mural AppBar always re-opens the sheet

## Morph

`gallery.morph.nativeMode = "hard-cut"` — show/hide finished↔raw on tap. No cross-fade on native v1.

Native emits Flutter MethodChannel `event`:

```json
{ "type": "galleryMorph", "nodeId": "raw", "message": "raw", "recoverable": false }
```

Flutter shows the sheet once on first `nodeId == "raw"`.

## Implementation home

Aura Lenses `apps/mobile`:

- iOS `MuralArView.swift` / Android `ModelFilamentLayer.kt` — hard-cut + events  
- Flutter `mural_ar_page.dart` — bottom sheet + `url_launcher`
