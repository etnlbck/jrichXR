# Support additional experience kinds

**Issue:** Support additional experience kinds  
**Wave:** 3 · **Effort:** L · **Status:** done (`experience` kind)

## Goal

Data model and UI support a kind beyond mural/sculpture morph assumptions.

## Shipped

- `ExperienceKind = 'mural' | 'experience'` in `@jrichforms/experience`
- `parseGalleryExperience` accepts both
- `supportsMorph()` — morph chrome only for `mural`
- Studio create flow: kind select → `createDraftFromSeed(..., { kind })`
- Visitor: skip morph tap / hints when `supportsMorph` is false

## Follow-up

Hide sculpture-only Studio/visitor chrome for `experience` → [25](25-desculpture-experience-kind.md).

## Acceptance

- [x] New kind can be created, published, and visited without morph chrome
- [x] Existing murals unchanged (`kind: mural`)
