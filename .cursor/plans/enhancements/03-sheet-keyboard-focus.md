# Pin/provenance sheet keyboard and focus

**Issue:** Pin/provenance sheet keyboard and focus  
**Wave:** 1 · **Effort:** S  
**Depends on:** none  
**Unlocks:** Visitor AR accessibility pass (Wave 2)

## Goal

Pin and provenance bottom sheets behave like dialogs: Escape closes, focus trapped, focus restored.

## Files

- [`apps/web/components/ArExperience.tsx`](../../../apps/web/components/ArExperience.tsx)
- Optional small hook: `apps/web/lib/use-dialog-focus.ts` (or inline)

## Steps

1. When `openPin` or `showProvenance` becomes true, move focus to the close button (or sheet container with `tabIndex={-1}`).
2. `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing at the sheet `h2`.
3. Keydown on `Escape` closes the active sheet (pause pin audio like existing close).
4. Focus trap: Tab cycles within sheet controls (close + links in provenance CTAs).
5. On close, restore focus to a sensible target (About button if provenance; canvas is poor — prefer About or a hidden “resume” control). Restoring to About when it was provenance; for pins, About or leave on document body.

## Acceptance

- [ ] Escape closes pin and provenance sheets
- [ ] Focus moves into sheet on open; Tab does not escape to chrome behind
- [ ] Screen reader announces dialog title
- [ ] Existing click-to-close still works

## Notes

Keep animation/`slideup` CSS. Do not change morph/tap canvas behavior.
