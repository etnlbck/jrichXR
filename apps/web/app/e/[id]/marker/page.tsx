import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MarkerSheet from '@/app/marker/MarkerSheet';
import { experienceMetadata } from '@/lib/brand-metadata';
import { loadConfigOrNull } from '@/lib/load-experience';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const config = await loadConfigOrNull((await params).id);
  return config
    ? experienceMetadata(config, {
        prefix: 'Print marker',
        description: `Printable image target for ${config.piece.title}.`,
      })
    : {};
}

export default async function ExperienceMarkerPage({ params }: Params) {
  const config = await loadConfigOrNull((await params).id);
  if (!config) notFound();
  return <MarkerSheet config={config} />;
}
