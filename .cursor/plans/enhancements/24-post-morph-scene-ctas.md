# Post-morph scene CTA overlays

**Issue:** Post-morph spatial CTA overlays  
**Wave:** 5 (deferred) · **Effort:** M–L · **Status:** planned  
**Depends on:** Richer pins ([13](13-richer-pins.md)); dead CSS intentionally removed ([04](04-delete-dead-css.md))

## Goal

Bring back spatial / in-scene call-to-action patterns (shop, inquire, external link) as first-class authored content—not resurrected dead CSS—coordinated with pin CTAs so artists aren’t forced into the About sheet only.

## Scope

### In

1. **CTA nodes or pin form** — either `type`-like overlay buttons in marker space, or pins with `ctaOnly` / large hit targets after morph to raw/finished.
2. Visitor: tap opens link or shop path; visible only on configured morph form.
3. Studio: author label, href, form (finished/raw/both), position (reuse pin placer or Nodes).
4. One composition rule: max N CTAs visible; no sticker spam on first Arrive frame (show after reveal complete).

### Out

- Re-adding unused `ctaPill` CSS as-is without a data model
- Full ecommerce cart inside WebAR

## Approach

1. Prefer extending `SpatialPin` (href already exists) with `style: 'dot' | 'cta'` **or** a small `gallery.ctas[]` array with placement vec3.
2. Scene: world-anchored plane/button mesh or HTML overlay projected via `pinNdc`-style — pick one for a11y (HTML overlay easier for focus).
3. Don’t show during densify; honor `supportsMorph` / form visibility like pins.
4. Delete-dead-CSS plan remains valid—new styles are intentional and minimal.

## Files

- [`packages/experience` types](../../../packages/experience/src/types.ts)
- [`scene.ts`](../../../apps/web/lib/scene.ts), [`ArExperience.tsx`](../../../apps/web/components/ArExperience.tsx)
- Studio Pins or new CTAs subsection

## Acceptance

- [ ] Artist can place at least one scene CTA, publish, visitor can activate after Arrive
- [ ] CTA respects finished/raw visibility
- [ ] Keyboard/focus path exists if HTML overlay chosen
