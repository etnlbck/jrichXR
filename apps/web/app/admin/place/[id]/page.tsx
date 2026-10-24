import { notFound } from 'next/navigation';
import PinArPlacer from '@/components/PinArPlacer';
import { requireArtist } from '@/lib/artist-access';
import { buildAppConfig } from '@/lib/config';
import { parseExperienceId } from '@/lib/experience-id';
import {
  canEditExperience,
  isBlobConfigured,
  seedDraftIfMissing,
} from '@/lib/experience-store';

export const dynamic = 'force-dynamic';

export default async function AdminPlacePinsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stage?: string | string[] }>;
}) {
  const { id: raw } = await params;
  const id = parseExperienceId(raw);
  if (!id) notFound();
  const artist = await requireArtist();
  if (!(await canEditExperience(id, artist))) notFound();

  let draft;
  try {
    draft = await seedDraftIfMissing(id);
  } catch {
    notFound();
  }
  const { stage } = await searchParams;

  return (
    <PinArPlacer
      experienceId={id}
      appConfig={buildAppConfig(draft.experience)}
      initialPins={draft.experience.gallery.pins ?? []}
      initialRevision={draft.revision}
      canSave={isBlobConfigured()}
      stage={stage === '1'}
    />
  );
}
