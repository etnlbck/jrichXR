import type { BrandFontId } from '@jrichforms/experience';

const SYSTEM_STACK =
  "'Avenir Next', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

/** Labels and CSS variables for the curated fonts defined in brand-fonts.ts. */
export const BRAND_FONT_OPTIONS: Record<BrandFontId, { label: string; cssVar: string | null }> = {
  system: { label: 'System (default)', cssVar: null },
  inter: { label: 'Inter', cssVar: '--font-inter' },
  'space-grotesk': { label: 'Space Grotesk', cssVar: '--font-space-grotesk' },
  archivo: { label: 'Archivo', cssVar: '--font-archivo' },
  'dm-serif-display': { label: 'DM Serif Display', cssVar: '--font-dm-serif' },
  'playfair-display': { label: 'Playfair Display', cssVar: '--font-playfair' },
  'cormorant-garamond': { label: 'Cormorant Garamond', cssVar: '--font-cormorant' },
};

/** CSS `font-family` value for a brand font. */
export function brandFontFamily(font: BrandFontId): string {
  const cssVar = BRAND_FONT_OPTIONS[font]?.cssVar;
  return cssVar ? `var(${cssVar}), ${SYSTEM_STACK}` : SYSTEM_STACK;
}

/**
 * Canvas text can't read CSS variables, so resolve the generated family name
 * from <html>. Call in the browser only.
 */
export function resolvedBrandFontFamily(font: BrandFontId): string {
  const cssVar = BRAND_FONT_OPTIONS[font]?.cssVar;
  if (!cssVar || typeof document === 'undefined') return SYSTEM_STACK;
  const family = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return family ? `${family}, ${SYSTEM_STACK}` : SYSTEM_STACK;
}
