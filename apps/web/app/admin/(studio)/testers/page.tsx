import { redirect } from 'next/navigation';
import AdminTesters from '@/components/AdminTesters';
import { requireArtist } from '@/lib/artist-access';

export default async function AdminTestersPage() {
  const session = await requireArtist();
  if (!session.isAdmin) redirect('/admin');
  return <AdminTesters />;
}
