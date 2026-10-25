'use client';

import { upload } from '@vercel/blob/client';
import {
  BRAND_DEFAULTS,
  BRAND_FONT_IDS,
  BRAND_TEXT_LIMITS,
  buttonContrast,
  resolveBrand,
  type ArtistBrand,
  type BrandFontId,
  type ResolvedBrand,
} from '@jrichforms/experience';
import { useState } from 'react';
import { BRAND_FONT_OPTIONS } from '@/lib/brand-font-options';
import { brandStyle } from '@/lib/brand-style';
import { brandAssetPathname } from '@/lib/experience-store-client';
import ar from './ArExperience.module.css';
import admin from '@/app/admin/admin.module.css';
import styles from './BrandFields.module.css';

type ImageField = 'logoUrl' | 'shareImageUrl';

type Props = {
  value: ArtistBrand;
  onChange: (next: ArtistBrand) => void;
  /** Brand folder the images upload into. */
  uploadUserId: string;
  /**
   * Override mode: empty fields inherit from this brand instead of the
   * platform defaults, and the upload doesn't touch the profile.
   */
  inherited?: ArtistBrand;
  disabled?: boolean;
  previewTitle?: string;
};

const SHARE_W = 1200;
const SHARE_H = 630;

function imageSize(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function shareSizeWarning(size: { w: number; h: number } | null): string | null {
  if (!size) return 'Could not read the image size.';
  const ratio = size.w / size.h;
  const target = SHARE_W / SHARE_H;
  if (size.w < SHARE_W * 0.8 || Math.abs(ratio - target) > 0.15) {
    return `This image is ${size.w}×${size.h}. Link previews look best at ${SHARE_W}×${SHARE_H}; other sizes may be cropped.`;
  }
  return null;
}

export default function BrandFields({
  value,
  onChange,
  uploadUserId,
  inherited,
  disabled,
  previewTitle = 'Your sculpture',
}: Props) {
  const overrideMode = inherited !== undefined;
  const effective = resolveBrand({ ...(inherited ?? {}), ...value });
  const base = resolveBrand(inherited ?? {});
  const [uploading, setUploading] = useState<ImageField | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareWarning, setShareWarning] = useState<string | null>(null);
  const lowContrast = buttonContrast(effective.accentFrom, effective.accentTo) < 3;

  function set<K extends keyof ArtistBrand>(key: K, next: ArtistBrand[K] | undefined) {
    const copy = { ...value };
    if (next === undefined || next === '') delete copy[key];
    else copy[key] = next;
    onChange(copy);
  }

  async function onImage(field: ImageField, file: File) {
    setError(null);
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Use a PNG, JPEG, or WebP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Images must be 2 MB or smaller.');
      return;
    }
    const assetId = field === 'logoUrl' ? 'logo' : 'share';
    if (field === 'shareImageUrl') setShareWarning(shareSizeWarning(await imageSize(file)));
    setUploading(field);
    try {
      const blob = await upload(brandAssetPathname(uploadUserId, assetId, file.name), file, {
        access: 'public',
        handleUploadUrl: '/api/admin/upload',
        clientPayload: JSON.stringify({
          scope: 'brand',
          assetId,
          userId: uploadUserId,
          apply: overrideMode ? 'none' : 'profile',
        }),
      });
      set(field, blob.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  }

  function textField(
    key: 'displayName' | 'beginText' | 'beginLabel' | 'loadingText',
    label: string,
    fallback: string,
    multiline = false
  ) {
    const id = `brand-${key}${overrideMode ? '-override' : ''}`;
    const props = {
      id,
      value: value[key] ?? '',
      maxLength: BRAND_TEXT_LIMITS[key],
      placeholder: fallback,
      disabled,
      onChange: (e: { target: { value: string } }) => set(key, e.target.value),
    };
    return (
      <div className={admin.field}>
        <label htmlFor={id}>{label}</label>
        {multiline ? <textarea {...props} /> : <input {...props} />}
      </div>
    );
  }

  function imageField(field: ImageField, label: string, hint: string) {
    const current = value[field];
    const shown = current ?? (field === 'logoUrl' ? base.logoUrl : base.shareImageUrl);
    return (
      <div className={admin.assetRow}>
        <strong>{label}</strong>
        <label className={admin.btn}>
          {uploading === field ? 'Uploading…' : current ? 'Replace' : 'Upload'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            disabled={disabled || uploading !== null}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImage(field, file);
              e.target.value = '';
            }}
          />
        </label>
        {current && (
          <button
            type="button"
            className={admin.btn}
            disabled={disabled}
            onClick={() => set(field, undefined)}
          >
            {overrideMode ? 'Inherit' : 'Remove'}
          </button>
        )}
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- Blob upload preview
          <img
            className={field === 'logoUrl' ? styles.thumbLogo : styles.thumbShare}
            src={shown}
            alt=""
          />
        ) : (
          <span className={styles.hint}>{hint}</span>
        )}
        {!current && shown && overrideMode && <span className={styles.hint}>From profile</span>}
      </div>
    );
  }

  function colorField(key: 'accentFrom' | 'accentTo', label: string) {
    const id = `brand-${key}${overrideMode ? '-override' : ''}`;
    return (
      <div className={admin.field}>
        <label htmlFor={id}>{label}</label>
        <div className={styles.colorRow}>
          <input
            id={id}
            type="color"
            className={admin.swatchCustom}
            value={effective[key]}
            disabled={disabled}
            onChange={(e) => set(key, e.target.value.toLowerCase())}
          />
          <code>{effective[key]}</code>
          <button
            type="button"
            className={admin.btn}
            disabled={disabled || value[key] === undefined}
            onClick={() => set(key, undefined)}
          >
            {overrideMode ? 'Inherit' : 'Default'}
          </button>
        </div>
      </div>
    );
  }

  const fontId = `brand-font${overrideMode ? '-override' : ''}`;

  return (
    <div className={styles.layout}>
      <div className={admin.panel}>
        {textField('displayName', 'Artist or studio name', base.displayName ?? 'Shown on the Begin screen and in link previews')}
        {imageField('logoUrl', 'Logo', 'PNG, JPEG, or WebP, up to 2 MB. Shown on a dark background.')}
        <div className={admin.row}>
          {colorField('accentFrom', 'Accent (start)')}
          {colorField('accentTo', 'Accent (end)')}
        </div>
        {lowContrast && (
          <p className={admin.error}>
            The button text will be hard to read on these colors. Try colors
            that are both lighter or both darker.
          </p>
        )}
        <div className={admin.field}>
          <label htmlFor={fontId}>Font</label>
          <select
            id={fontId}
            value={value.font ?? ''}
            disabled={disabled}
            onChange={(e) => set('font', (e.target.value || undefined) as BrandFontId | undefined)}
          >
            <option value="">
              {overrideMode
                ? `Inherit (${BRAND_FONT_OPTIONS[base.font].label})`
                : BRAND_FONT_OPTIONS[BRAND_DEFAULTS.font].label}
            </option>
            {BRAND_FONT_IDS.filter((f) => f !== 'system').map((f) => (
              <option key={f} value={f}>
                {BRAND_FONT_OPTIONS[f].label}
              </option>
            ))}
          </select>
        </div>
        {textField('beginText', 'Begin screen instructions', base.beginText, true)}
        <div className={admin.row}>
          {textField('beginLabel', 'Begin button', base.beginLabel)}
          {textField('loadingText', 'Loading text', base.loadingText)}
        </div>
        {imageField('shareImageUrl', 'Share image', `Link preview image, ${SHARE_W}×${SHARE_H}. Falls back to the logo.`)}
        {shareWarning && <p className={admin.status}>{shareWarning}</p>}
        {error && (
          <p className={admin.error} role="alert">
            {error}
          </p>
        )}
      </div>
      <BrandPreview brand={effective} title={previewTitle} />
    </div>
  );
}

export function BrandPreview({ brand, title }: { brand: ResolvedBrand; title: string }) {
  return (
    <figure className={styles.previewWrap}>
      <figcaption className={admin.status}>Preview (draft + current profile)</figcaption>
      <div className={styles.preview} style={brandStyle(brand)}>
        <div className={ar.gateCard}>
          {brand.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- Blob upload preview
            <img className={ar.brandLogo} src={brand.logoUrl} alt="" />
          )}
          {brand.displayName && <p className={ar.brandName}>{brand.displayName}</p>}
          <h1>{title}</h1>
          <p>{brand.beginText}</p>
          <span className={ar.beginBtn}>{brand.beginLabel}</span>
          <small>Camera access is required. Nothing is recorded.</small>
        </div>
      </div>
    </figure>
  );
}
