# Visitor AR accessibility pass

**Issue:** Visitor AR accessibility pass  
**Wave:** 2 · **Effort:** M  
**Depends on:** Sheet keyboard/focus (Wave 1)

## Goal

Raise visitor AR baseline: sheets (done in Wave 1), reduced-motion documentation/behavior, and better non-pointer affordances where feasible.

## Approach

1. Audit Begin/loading/scan/error for labels and live regions.
2. Document reduced-motion: short fade, no densify cloud (already partially done)—ensure About/prompt still reachable.
3. DesktopGate and stage: keyboard path to “View in 3D” / About.
4. Canvas morph/pins remain pointer-primary; add visible hint that pins are tappable; avoid claiming full AT support for WebAR canvas.
5. Contrast check on prompt/About over camera.

## Files

`ArExperience.tsx`, `DesktopGate.tsx`, `XrIssueSheet.tsx`, CSS, short README or Studio note.

## Acceptance

- Escape/focus sheets work (Wave 1)
- Reduced-motion users reach chrome without cloud
- No regressions on phone Arrive
