import ArExperience from '@/components/ArExperience';
import { loadExperience } from '@/lib/load-experience';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { config } = await loadExperience();
  return <ArExperience appConfig={config} />;
}
