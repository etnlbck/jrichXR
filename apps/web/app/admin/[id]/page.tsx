import AdminEditor from '@/components/AdminEditor';
import { parseExperienceId } from '@/lib/experience-id';
import { notFound } from 'next/navigation';

export default async function AdminExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: raw } = await params;
  const id = parseExperienceId(raw);
  if (!id) notFound();
  return <AdminEditor experienceId={id} />;
}
