# Desculpture the `experience` kind

**Issue:** Deeper experience kind (hide sculpture-only chrome)  
**Wave:** 5 (deferred) · **Effort:** L · **Status:** planned  
**Depends on:** `kind: 'mural' | 'experience'` + `supportsMorph` ([16](16-experience-kinds.md))

## Goal

Make `kind: 'experience'` a real product shape—not just morph-off—by making provenance, shop, and morph Studio/visitor surfaces optional or hidden when they don’t apply.

## Scope

### In

1. **Package** — optional `gallery.provenance` fields / shop; morph block ignored for experience kind (already no morph chrome).
2. **Studio** — hide or collapse Provenance & shop, Morph knobs, Raw asset slot for `experience`; Nodes/Brand/Marker remain primary.
3. **Visitor** — About sheet copy becomes generic (“About”) with only filled fields; hide Shop/Inquire when unset; prompts without morph language (partially done).
4. **Create flow** — kind-specific seed template (lighter than Untitled No. 7 clone) or post-clone strip of mural-only nodes/assets.
5. Migration: existing `mural` unchanged; `experience` drafts created today keep working.

### Out

- Multiple unrelated schemas (keep one GalleryExperience with optionality)
- Lenses publish parity for every optional field

## Approach

1. Soften parse validation: provenance/shop required only for `mural` (or always allowed empty strings).
2. `AdminEditor` / `AdminList`: conditional tabs and labels from `experience.kind`.
3. `buildAppConfig`: empty shop paths → no CTA; About renders dynamically.
4. Optional `cloneSeedForId` variant for experience kind with fewer nodes (finished-only or empty props).

## Files

- [`packages/experience`](../../../packages/experience/src/) parse + types
- [`experience-store.ts`](../../../apps/web/lib/experience-store.ts) create seed
- [`AdminEditor.tsx`](../../../apps/web/components/AdminEditor.tsx), [`AdminList.tsx`](../../../apps/web/components/AdminList.tsx)
- [`ArExperience.tsx`](../../../apps/web/components/ArExperience.tsx), [`config.ts`](../../../apps/web/lib/config.ts)

## Acceptance

- [ ] New `experience` kind Studio UI omits mural-only sections
- [ ] Visitor About/shop chrome absent when data omitted
- [ ] Existing murals behave identically
