import { notFound } from 'next/navigation';
import ArExperience from '@/components/ArExperience';
import { parseExperienceId } from '@/lib/experience-id';
import {
  ExperienceNotFoundError,
  loadExperience,
} from '@/lib/load-experience';

export const dynamic = 'force-dynamic';

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
