import AdminEditor from '@/components/AdminEditor';
import { requireArtist } from '@/lib/artist-access';
import { parseEditorTab } from '@/lib/editor-tabs';
import { parseExperienceId } from '@/lib/experience-id';
import { canEditExperience } from '@/lib/experience-store';
import { notFound } from 'next/navigation';

export default async function AdminExperiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id: raw } = await params;
  const id = parseExperienceId(raw);
  if (!id) notFound();
  const artist = await requireArtist();
  if (!(await canEditExperience(id, artist))) notFound();
  const { tab } = await searchParams;
  return <AdminEditor experienceId={id} initialTab={parseEditorTab(tab)} />;
}
