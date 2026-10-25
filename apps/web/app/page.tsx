import type { Metadata, Viewport } from 'next';
import ArExperience from '@/components/ArExperience';
import { experienceMetadata, experienceViewport } from '@/lib/brand-metadata';
import { loadConfigOrNull, loadExperience } from '@/lib/load-experience';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const config = await loadConfigOrNull();
  return config ? experienceMetadata(config) : {};
}

export async function generateViewport(): Promise<Viewport> {
  const config = await loadConfigOrNull();
  return config ? experienceViewport(config) : {};
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string | string[] }>;
}) {
  const query = await searchParams;
  const stage = query.stage === '1';
  const { config } = await loadExperience();
  return <ArExperience appConfig={config} stage={stage} />;
}
