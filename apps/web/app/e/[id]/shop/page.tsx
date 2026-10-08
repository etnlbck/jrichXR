import { notFound } from 'next/navigation';
import ShopClient from '@/app/shop/ShopClient';
import { parseExperienceId, visitorArPath } from '@/lib/experience-id';
import {
  ExperienceNotFoundError,
  loadExperience,
} from '@/lib/load-experience';

export const dynamic = 'force-dynamic';

export default async function ExperienceShopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: raw } = await params;
  const id = parseExperienceId(raw);
  if (!id) notFound();

  let config;
  try {
    ({ config } = await loadExperience(id));
  } catch (err) {
    if (err instanceof ExperienceNotFoundError) notFound();
    throw err;
  }

  return (
    <ShopClient
      experienceId={id}
      arHref={visitorArPath(id)}
      piece={{
        title: config.piece.title,
        acquireUrl: config.piece.acquireUrl,
      }}
    />
  );
}
