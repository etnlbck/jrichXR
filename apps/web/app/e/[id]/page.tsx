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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: raw } = await params;
  const id = parseExperienceId(raw);
  if (!id) notFound();

  let config;
  try {
    ({ config } = await loadExperience(id));
  } catch (err) {
    if (err instanceof ExperienceNotFoundError) notFound();
    throw err;
  }

  return <ArExperience appConfig={config} />;
}
