import { loadExperience } from '@/lib/load-experience';
import ShopClient from './ShopClient';

export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  const { config } = await loadExperience();
  return (
    <ShopClient
      piece={{
        title: config.piece.title,
        acquireUrl: config.piece.acquireUrl,
      }}
    />
  );
}
