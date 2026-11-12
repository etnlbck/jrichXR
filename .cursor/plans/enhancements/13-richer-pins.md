# Richer pins (links, media, CTAs)

**Issue:** Richer pins (links, media, CTAs)  
**Wave:** 2 · **Effort:** M  
**Depends on:** Sheet keyboard/focus; optional delete-dead-CSS (avoid reviving old CTA CSS blindly)

## Goal

Pins support more than title/body/audio—links, image, or primary CTA—with Studio edit and visitor sheet UI.

## Approach

1. Extend pin schema in `@jrichforms/experience` (optional `href`, `imageUrl`, `ctaLabel`).
2. AdminEditor pin form fields + Blob upload for pin image if needed.
3. Visitor sheet renders media + link button; keep audio behavior.
4. Migration: old pins remain valid (all new fields optional).

## Files

`packages/experience` pin types, `AdminEditor` / pin APIs, `ArExperience` panel, experience-store.

## Acceptance

- Artist can add a link CTA pin; visitor can open it from the sheet
- Experiences without rich fields unchanged
- Publish/draft round-trip preserves new fields
