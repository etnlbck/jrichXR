import { notFound } from 'next/navigation';
import PinArPlacer from '@/components/PinArPlacer';
import { requireArtist } from '@/lib/artist-access';
import { buildAppConfig } from '@/lib/config';
import { parseExperienceId } from '@/lib/experience-id';
import { getArtistBrand } from '@/lib/brand-store';
import {
  canEditExperience,
  getExperienceAccess,
  isBlobConfigured,
  pendingBrand,
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
  const access = await getExperienceAccess(id);
  const brand = pendingBrand(
    draft.experience,
    access ? await getArtistBrand(access.ownerUserId) : {}
  );

  return (
    <PinArPlacer
      experienceId={id}
      appConfig={buildAppConfig({ ...draft.experience, brand })}
      initialPins={draft.experience.gallery.pins ?? []}
      initialRevision={draft.revision}
      canSave={isBlobConfigured()}
      stage={stage === '1'}
    />
  );
}
