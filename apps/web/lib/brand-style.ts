import type { CSSProperties } from 'react';
import type { ResolvedBrand } from '@jrichforms/experience';
import { brandFontFamily } from '@/lib/brand-font-options';

/** Inline custom properties that re-theme everything under the element. */
export function brandStyle(brand: ResolvedBrand): CSSProperties {
  return {
    '--ember': brand.accentFrom,
    '--violet': brand.accentTo,
    '--brand-ink': brand.buttonInk,
    '--brand-font': brandFontFamily(brand.font),
    fontFamily: 'var(--brand-font)',
  } as CSSProperties;
}
