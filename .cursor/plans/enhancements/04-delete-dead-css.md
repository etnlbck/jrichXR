# Delete unused ArExperience visitor CSS

**Issue:** Delete unused ArExperience visitor CSS  
**Wave:** 1 · **Effort:** S  
**Depends on:** none  
**Unlocks:** cleaner CSS for densify/chrome work

## Goal

Remove unused visitor CSS in `ArExperience.module.css` (cta/preview/social/fullOverlay remnants). Do **not** revive CTAs.

## Files

- [`apps/web/components/ArExperience.module.css`](../../../apps/web/components/ArExperience.module.css)
- Grep confirm no references in `apps/web`

## Steps

1. Grep for class names: `ctaLayer`, `pieceLabel`, `ctaPill`, `previewOuter`, `previewStage`, `previewImg`, `previewCaptionBelow`, `previewTitle`, `previewArtist`, `ctaPillScatter`, `ctaTopLeft`, `ctaMidRight`, `ctaBottomLeft`, `ctaBottomRight`, `fullOverlay`, `overlayHeader`, `overlayHeaderTitle`, `overlayCloseBtn`, `overlayBody`, `overlayCaption`, `videoEmbed`, `avatarLarge`, `artistName`, `tagsRow`, `tag`, `overlayTabbar`, `overlayTabBtn`, `progressTrack`, `progressFill`, `connectLabel`, `socialRow`, `socialCircle`, `formLabel`, `formInput`, `formTextarea`, `submitBtn`, unused `@keyframes` (`ctaFadeIn`, `imageFadeIn` if unused).
2. Delete dead rules and orphaned keyframes only.
3. Keep live classes: gate, loading, hint, reticle, prompt, about, panel, fadeIn/Out, attrib, brand, beginBtn, etc.
4. Run a quick visual smoke on Begin / loading / scan / sheet.

## Acceptance

- [ ] No remaining references to deleted class names in TSX
- [ ] Visitor overlays and sheets still styled
- [ ] Diff is CSS-only (plus maybe comment cleanup)

## Notes

If any class is used only in BrandFields preview via string import, verify BrandFields before deleting.

## Follow-up

Intentional post-morph scene CTAs (new data model, not revived dead CSS) → [24](24-post-morph-scene-ctas.md).
