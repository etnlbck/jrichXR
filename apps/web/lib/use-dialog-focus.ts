'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Focus management for a modal sheet: focus on open, Escape to close,
 * Tab trap, restore focus on close.
 */
export function useDialogFocus(
  open: boolean,
  onClose: () => void,
  restoreFocusRef?: RefObject<HTMLElement | null>
) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current =
      (document.activeElement as HTMLElement | null) ?? null;
    const focusTarget = closeRef.current ?? panelRef.current;
    window.requestAnimationFrame(() => focusTarget?.focus());

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const restore =
        restoreFocusRef?.current ?? previouslyFocused.current;
      restore?.focus?.();
    };
  }, [open, onClose, restoreFocusRef]);

  return { panelRef, closeRef };
}
