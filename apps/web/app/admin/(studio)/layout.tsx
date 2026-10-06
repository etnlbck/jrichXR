import { redirect } from 'next/navigation';
import { ArtistAccessError, requireArtist } from '@/lib/artist-access';

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireArtist();
  } catch (err) {
    if (err instanceof ArtistAccessError && err.status === 401) {
      redirect('/admin/sign-in');
    }
    if (err instanceof ArtistAccessError && err.status === 403) {
      redirect('/admin/pending');
    }
    throw err;
  }
  return children;
}
