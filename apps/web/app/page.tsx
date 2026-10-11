import ArExperience from '@/components/ArExperience';
import { loadExperience } from '@/lib/load-experience';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string | string[] }>;
}) {
  const query = await searchParams;
  const stage = query.stage === '1';
  const { config } = await loadExperience();
  return <ArExperience appConfig={config} stage={stage} />;
}
