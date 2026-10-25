import type { Metadata, Viewport } from 'next';
import { experienceMetadata, experienceViewport } from '@/lib/brand-metadata';
import { loadConfigOrNull, loadExperience } from '@/lib/load-experience';
import ShopClient from './ShopClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const config = await loadConfigOrNull();
  return config
    ? experienceMetadata(config, {
        prefix: 'Shop',
        description: `Pieces and prints related to ${config.piece.title}.`,
      })
    : {};
}

export async function generateViewport(): Promise<Viewport> {
  const config = await loadConfigOrNull();
  return config ? experienceViewport(config) : {};
}

export default async function ShopPage() {
  const { config } = await loadExperience();
  return (
    <ShopClient
      brand={config.brand}
      piece={{
        title: config.piece.title,
        acquireUrl: config.piece.acquireUrl,
      }}
    />
  );
}
