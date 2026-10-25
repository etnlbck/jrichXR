import type { ArtistBrand, BrandFontId } from './types';

export const BRAND_FONT_IDS: BrandFontId[] = [
  'system',
  'inter',
  'space-grotesk',
  'archivo',
  'dm-serif-display',
  'playfair-display',
  'cormorant-garamond',
];

export const BRAND_TEXT_LIMITS = {
  displayName: 60,
  beginText: 160,
  beginLabel: 40,
  loadingText: 40,
} as const;

export type ResolvedBrand = {
  displayName: string | null;
  logoUrl: string | null;
  accentFrom: string;
  accentTo: string;
  font: BrandFontId;
  beginText: string;
  beginLabel: string;
  loadingText: string;
  shareImageUrl: string | null;
  /** Text color on the accent gradient. */
  buttonInk: string;
};

export const BRAND_DEFAULTS = {
  accentFrom: '#1732a4',
  accentTo: '#21d3d5',
  font: 'system' as BrandFontId,
  beginText: 'Point your phone at the marker beside the sculpture.',
  beginLabel: 'Begin',
  loadingText: 'Loading experience…',
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const BRAND_KEYS: (keyof ArtistBrand)[] = [
  'displayName',
  'logoUrl',
  'accentFrom',
  'accentTo',
  'font',
  'beginText',
  'beginLabel',
  'loadingText',
  'shareImageUrl',
];

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return t || undefined;
}

function cleanColor(value: unknown): string | undefined {
  return typeof value === 'string' && HEX_COLOR.test(value)
    ? value.toLowerCase()
    : undefined;
}

/** Only images we host on Vercel Blob. */
export function isBrandImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

/** Drops anything malformed; the result has only valid, non-empty fields. */
export function sanitizeBrand(raw: unknown): ArtistBrand {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: ArtistBrand = {};
  const displayName = cleanText(r.displayName, BRAND_TEXT_LIMITS.displayName);
  if (displayName) out.displayName = displayName;
  if (isBrandImageUrl(r.logoUrl)) out.logoUrl = r.logoUrl;
  const accentFrom = cleanColor(r.accentFrom);
  if (accentFrom) out.accentFrom = accentFrom;
  const accentTo = cleanColor(r.accentTo);
  if (accentTo) out.accentTo = accentTo;
  if (BRAND_FONT_IDS.includes(r.font as BrandFontId)) out.font = r.font as BrandFontId;
  const beginText = cleanText(r.beginText, BRAND_TEXT_LIMITS.beginText);
  if (beginText) out.beginText = beginText;
  const beginLabel = cleanText(r.beginLabel, BRAND_TEXT_LIMITS.beginLabel);
  if (beginLabel) out.beginLabel = beginLabel;
  const loadingText = cleanText(r.loadingText, BRAND_TEXT_LIMITS.loadingText);
  if (loadingText) out.loadingText = loadingText;
  if (isBrandImageUrl(r.shareImageUrl)) out.shareImageUrl = r.shareImageUrl;
  return out;
}

/** Profile values, replaced field-by-field by any overrides. */
export function mergeBrand(
  profile: ArtistBrand | null | undefined,
  overrides: ArtistBrand | null | undefined
): ArtistBrand {
  return sanitizeBrand({ ...sanitizeBrand(profile), ...sanitizeBrand(overrides) });
}

function channel(v: number): number {
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of `#rrggbb`. */
export function relativeLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = channel(((n >> 16) & 255) / 255);
  const g = channel(((n >> 8) & 255) / 255);
  const b = channel((n & 255) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const INK_DARK = '#101014';
const INK_LIGHT = '#ffffff';

/** Dark or light text, whichever reads better across both gradient stops. */
export function buttonInk(from: string, to: string): string {
  const light = Math.min(contrastRatio(INK_LIGHT, from), contrastRatio(INK_LIGHT, to));
  const dark = Math.min(contrastRatio(INK_DARK, from), contrastRatio(INK_DARK, to));
  return dark > light ? INK_DARK : INK_LIGHT;
}

/** Worst-case contrast of the chosen ink against the gradient; below 3 is hard to read. */
export function buttonContrast(from: string, to: string): number {
  const ink = buttonInk(from, to);
  return Math.min(contrastRatio(ink, from), contrastRatio(ink, to));
}

export function resolveBrand(brand: ArtistBrand | null | undefined): ResolvedBrand {
  const b = sanitizeBrand(brand);
  const accentFrom = b.accentFrom ?? BRAND_DEFAULTS.accentFrom;
  const accentTo = b.accentTo ?? b.accentFrom ?? BRAND_DEFAULTS.accentTo;
  return {
    displayName: b.displayName ?? null,
    logoUrl: b.logoUrl ?? null,
    accentFrom,
    accentTo,
    font: b.font ?? BRAND_DEFAULTS.font,
    beginText: b.beginText ?? BRAND_DEFAULTS.beginText,
    beginLabel: b.beginLabel ?? BRAND_DEFAULTS.beginLabel,
    loadingText: b.loadingText ?? BRAND_DEFAULTS.loadingText,
    shareImageUrl: b.shareImageUrl ?? null,
    buttonInk: buttonInk(accentFrom, accentTo),
  };
}

/** Stable fingerprint of a brand, independent of key order. */
export function brandHash(brand: ArtistBrand | null | undefined): string {
  const b = sanitizeBrand(brand);
  const canonical = BRAND_KEYS.map((k) => `${k}=${b[k] ?? ''}`).join('\n');
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
