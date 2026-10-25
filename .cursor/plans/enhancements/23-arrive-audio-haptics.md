# Arrive audio sting and haptics

**Issue:** Arrive audio sting / haptics  
**Wave:** 5 (deferred) · **Effort:** S–M · **Status:** planned  
**Depends on:** Arrive densify (Path A); audio unlock on Begin

## Goal

Add a short, brandable sensory cue when densify completes (and optionally on first lock)—without competing with narration or feeling gimmicky.

## Scope

### In

1. **Audio sting** — short one-shot buffer (gallery or brand asset); play on `reveal_complete` after unlock; duck or skip if narration already playing.
2. **Haptics** — `navigator.vibrate` pattern on supporting Android (and any future Web Vibration support); no-op elsewhere.
3. Studio: optional upload for sting + enable toggles; default off or very subtle stock sting.
4. Respect `prefers-reduced-motion` / reduced sensory: skip haptics; quieter or skip sting.

### Out

- Full adaptive music score
- iOS haptic engine APIs unavailable on the web

## Approach

1. Asset role `arrive-sting` or brand-level URL; preload after Begin.
2. Hook in scene `onRevealComplete` / ArExperience callback next to existing chrome fade-in.
3. Vibration: short `[10, 30, 10]` or similar; gate behind gallery `reveal.haptics !== false`.
4. Metrics: optional `arrive_sting_played` only if metrics flag on.

## Files

- [`scene.ts`](../../../apps/web/lib/scene.ts) / [`ArExperience.tsx`](../../../apps/web/components/ArExperience.tsx)
- [`reveal.ts`](../../../apps/web/lib/reveal.ts) or gallery.reveal extensions
- Studio Assets / Placement knobs

## Acceptance

- [ ] Sting plays once per Arrive when enabled and unlocked
- [ ] Narration path remains correct when both exist
- [ ] Haptics no-op safely on unsupported browsers
- [ ] Reduced-motion / disable toggles work
