import { redirect } from 'next/navigation';
import AdminStudioNav from '@/components/AdminStudioNav';
import { ArtistAccessError, requireArtist } from '@/lib/artist-access';
import styles from '../admin.module.css';

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let isAdmin = false;
  try {
    ({ isAdmin } = await requireArtist());
  } catch (err) {
    if (err instanceof ArtistAccessError && err.status === 401) {
      redirect('/admin/sign-in');
    }
    if (err instanceof ArtistAccessError && err.status === 403) {
      redirect('/admin/pending');
    }
    throw err;
  }
  return (
    <div className={styles.page}>
      <AdminStudioNav isAdmin={isAdmin} />
      {children}
    </div>
  );
}
