import AdminEditor from '@/components/AdminEditor';
import { requireArtist } from '@/lib/artist-access';
import { parseExperienceId } from '@/lib/experience-id';
import { canEditExperience } from '@/lib/experience-store';
import { notFound } from 'next/navigation';

export default async function AdminExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: raw } = await params;
  const id = parseExperienceId(raw);
  if (!id) notFound();
  const artist = await requireArtist();
  if (!(await canEditExperience(id, artist))) notFound();
  return <AdminEditor experienceId={id} />;
}
