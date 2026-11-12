'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from '@/app/admin/admin.module.css';

type AdminTooltipProps = {
  /** Short help sentence shown in the tip. */
  label: string;
  /** Accessible name for the “?” button (defaults to “About …” from about). */
  about?: string;
  /** Optional control to place before the tip trigger. */
  children?: ReactNode;
  className?: string;
};

/**
 * Compact “?” tip for Admin Studio. Opens on hover and focus; closes on leave,
 * blur, Escape, or outside click.
 */
export default function AdminTooltip({
  label,
  about,
  children,
  className,
}: AdminTooltipProps) {
  const tipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const ariaAbout = about ? `About ${about}` : 'More info';

  return (
    <span
      ref={rootRef}
      className={`${styles.tipRoot}${className ? ` ${className}` : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      <button
        type="button"
        className={styles.tipTrigger}
        aria-label={ariaAbout}
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!rootRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        onClick={() => setOpen(true)}
      >
        ?
      </button>
      {open ? (
        <span id={tipId} role="tooltip" className={styles.tipBubble}>
          {label}
        </span>
      ) : null}
    </span>
  );
}

/** Label row with an optional tip next to the text. */
export function FieldLabel({
  children,
  tip,
  htmlFor,
}: {
  children: ReactNode;
  tip?: string;
  htmlFor?: string;
}) {
  if (!tip) {
    return htmlFor ? <label htmlFor={htmlFor}>{children}</label> : <label>{children}</label>;
  }
  return (
    <span className={styles.tipLabelRow}>
      {htmlFor ? <label htmlFor={htmlFor}>{children}</label> : <label>{children}</label>}
      <AdminTooltip label={tip} about={typeof children === 'string' ? children : undefined} />
    </span>
  );
}
