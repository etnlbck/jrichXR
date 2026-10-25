# Social network share targets

**Issue:** Social share targets (beyond Web Share / copy link)  
**Wave:** 5 (deferred) · **Effort:** M · **Status:** planned  
**Depends on:** In-experience Share ([12](12-in-experience-share.md)); brand `shareImageUrl`

## Goal

Offer explicit outbound share affordances (e.g. X/Twitter, WhatsApp, Messages deep links) when Web Share API is missing or artists want one-tap network targets—without building full OAuth social apps.

## Scope

### In

1. Share sheet / menu: Copy link (exists), Web Share (exists), plus 1–3 **intent URLs** (WhatsApp `wa.me`, X intent, mailto).
2. Prefill text from piece title + artist display name; URL = visitor AR deep link.
3. Prefer `shareImageUrl` only where the OS share sheet can attach (Web Share Level 2); intent links stay URL+text.
4. Studio: optional toggles for which targets appear (default: system share + copy only until enabled).

### Out

- Facebook/Instagram Graph posting, scheduled posts, analytics pixels
- Requiring visitors to sign into social networks inside the AR page

## Approach

1. Small `buildShareTargets(url, text)` helper; render as secondary buttons under Share.
2. Feature-flag or brand/gallery `shareTargets?: ('whatsapp' | 'x' | 'email')[]`.
3. Keep mobile-first; hide awkward desktop intents or map to web intent pages.
4. No new dependencies.

## Files

- [`ArExperience.tsx`](../../../apps/web/components/ArExperience.tsx)
- Optional gallery/brand fields in [`packages/experience`](../../../packages/experience/src/types.ts)
- Studio Brand or Overview toggles

## Acceptance

- [ ] At least two intent targets open with correct URL + copy
- [ ] Web Share / copy still primary
- [ ] Missing share image does not break intents
