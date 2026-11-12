import BrandEditor from '@/components/BrandEditor';
import { requireArtist } from '@/lib/artist-access';
import { isValidUserId } from '@/lib/brand-store';

export default async function AdminBrandPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string | string[] }>;
}) {
  const session = await requireArtist();
  const { userId: requested } = await searchParams;
  const userId =
    session.isAdmin && isValidUserId(requested) ? requested : session.userId;
  return (
    <BrandEditor
      key={userId}
      userId={userId}
      isAdmin={session.isAdmin}
      currentUserId={session.userId}
    />
  );
}
