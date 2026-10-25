import type { Metadata, Viewport } from 'next';
import type { AppConfig } from '@/lib/config';

/** "Piece — Artist", or just the piece when the artist has no display name. */
export function brandedTitle(config: AppConfig, prefix?: string): string {
  const piece = prefix ? `${prefix} · ${config.piece.title}` : config.piece.title;
  return config.brand.displayName ? `${piece} — ${config.brand.displayName}` : piece;
}

export function experienceMetadata(
  config: AppConfig,
  opts: { prefix?: string; description?: string } = {}
): Metadata {
  const brand = config.brand;
  const title = brandedTitle(config, opts.prefix);
  const description =
    opts.description ??
    (brand.displayName
      ? `${config.piece.title} by ${brand.displayName}. Scan the marker to see it in AR.`
      : `${config.piece.title}. Scan the marker to see it in AR.`);
  const image = brand.shareImageUrl ?? brand.logoUrl ?? config.printImage;
  return {
    title,
    description,
    ...(brand.logoUrl ? { icons: { icon: brand.logoUrl, apple: brand.logoUrl } } : {}),
    openGraph: {
      title,
      description,
      type: 'website',
      ...(brand.displayName ? { siteName: brand.displayName } : {}),
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: {
      card: brand.shareImageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export function experienceViewport(config: AppConfig): Viewport {
  return { themeColor: config.brand.accentFrom };
}
