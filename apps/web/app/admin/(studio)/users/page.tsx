import { redirect } from 'next/navigation';
import AdminUsers from '@/components/AdminUsers';
import { requireArtist } from '@/lib/artist-access';

export default async function AdminUsersPage() {
  const session = await requireArtist();
  if (!session.isAdmin) redirect('/admin');
  return <AdminUsers />;
}
