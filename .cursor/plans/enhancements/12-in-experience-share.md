# In-experience share sheet / QR handoff

**Issue:** In-experience share sheet / QR handoff  
**Wave:** 2 · **Effort:** M  
**Depends on:** Brand share image (exists for OG)

## Goal

Visitors can share or hand off the experience in-AR (and improve desktop→phone beyond DesktopGate).

## Approach

1. After Arrive complete, optional Share control (Web Share API when available; copy link fallback).
2. Use brand `shareImageUrl` / title for share payload when set.
3. DesktopGate already has QR—ensure experience deep link is correct; optional “Show QR” from About sheet.
4. No new social network integrations in v1.

## Files

`ArExperience.tsx`, `DesktopGate.tsx`, brand metadata helpers.

## Acceptance

- Share or copy-link works on a supporting mobile browser
- Desktop QR still opens the phone experience URL
- Missing share image degrades gracefully
