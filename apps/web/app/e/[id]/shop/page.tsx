import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import ShopClient from '@/app/shop/ShopClient';
import { experienceMetadata, experienceViewport } from '@/lib/brand-metadata';
import { parseExperienceId, visitorArPath } from '@/lib/experience-id';
import { loadConfigOrNull } from '@/lib/load-experience';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const config = await loadConfigOrNull((await params).id);
  return config
    ? experienceMetadata(config, {
        prefix: 'Shop',
        description: `Pieces and prints related to ${config.piece.title}.`,
      })
    : {};
}

export async function generateViewport({ params }: Params): Promise<Viewport> {
  const config = await loadConfigOrNull((await params).id);
  return config ? experienceViewport(config) : {};
}

export default async function ExperienceShopPage({ params }: Params) {
  const id = parseExperienceId((await params).id);
  if (!id) notFound();
  const config = await loadConfigOrNull(id);
  if (!config) notFound();

  return (
    <ShopClient
      experienceId={id}
      arHref={visitorArPath(id)}
      brand={config.brand}
      piece={{
        title: config.piece.title,
        acquireUrl: config.piece.acquireUrl,
      }}
    />
  );
}
