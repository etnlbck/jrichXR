import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import ArExperience from '@/components/ArExperience';
import { experienceMetadata, experienceViewport } from '@/lib/brand-metadata';
import { parseExperienceId } from '@/lib/experience-id';
import {
  ExperienceNotFoundError,
  loadConfigOrNull,
  loadExperience,
} from '@/lib/load-experience';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const config = await loadConfigOrNull((await params).id);
  return config ? experienceMetadata(config) : {};
}

export async function generateViewport({ params }: Params): Promise<Viewport> {
  const config = await loadConfigOrNull((await params).id);
  return config ? experienceViewport(config) : {};
}

export default async function ExperiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stage?: string | string[] }>;
}) {
  const { id: raw } = await params;
  const id = parseExperienceId(raw);
  if (!id) notFound();
  const query = await searchParams;
  const stage = query.stage === '1';

  let config;
  try {
    ({ config } = await loadExperience(id));
  } catch (err) {
    if (err instanceof ExperienceNotFoundError) notFound();
    throw err;
  }

  return <ArExperience appConfig={config} stage={stage} />;
}
