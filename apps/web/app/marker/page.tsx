import type { Metadata } from 'next';
import { experienceMetadata } from '@/lib/brand-metadata';
import { loadConfigOrNull, loadExperience } from '@/lib/load-experience';
import MarkerSheet from './MarkerSheet';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const config = await loadConfigOrNull();
  return config
    ? experienceMetadata(config, {
        prefix: 'Print marker',
        description: `Printable image target for ${config.piece.title}.`,
      })
    : {};
}

export default async function MarkerPrintPage() {
  const { config } = await loadExperience();
  return <MarkerSheet config={config} />;
}
