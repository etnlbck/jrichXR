import AdminEditor from '@/components/AdminEditor';
import { requireArtist } from '@/lib/artist-access';
import { parseEditorTab } from '@/lib/editor-tabs';
import { parseExperienceId } from '@/lib/experience-id';
import { canEditExperience } from '@/lib/experience-store';
import { PIN_ID_RE } from '@/lib/pins';
import { notFound } from 'next/navigation';

export default async function AdminExperiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[]; pin?: string | string[] }>;
}) {
  const { id: raw } = await params;
  const id = parseExperienceId(raw);
  if (!id) notFound();
  const artist = await requireArtist();
  if (!(await canEditExperience(id, artist))) notFound();
  const { tab, pin } = await searchParams;
  const pinId = Array.isArray(pin) ? pin[0] : pin;
  return (
    <AdminEditor
      experienceId={id}
      initialTab={parseEditorTab(tab)}
      initialPinId={pinId && PIN_ID_RE.test(pinId) ? pinId : null}
    />
  );
}
