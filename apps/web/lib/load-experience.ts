import type { GalleryExperience } from '@jrichforms/experience';
import {
  buildAppConfig,
  DEFAULT_EXPERIENCE_ID,
  getSeedExperience,
  type AppConfig,
} from '@/lib/config';
import { getPublished, isBlobConfigured } from '@/lib/experience-store';

export type LoadedExperience = {
  experience: GalleryExperience;
  config: AppConfig;
  source: 'blob-published' | 'seed';
};

/**
 * Visitor runtime: published Blob package, else repo seed.
 */
export async function loadExperience(
  id = DEFAULT_EXPERIENCE_ID
): Promise<LoadedExperience> {
  if (isBlobConfigured()) {
    const published = await getPublished(id);
    // Prefer !== null — Turbopack has miscompiled truthy checks after await
    // on GalleryExperience | null (see seedDraftIfMissing).
    if (published !== null) {
      return {
        experience: published,
        config: buildAppConfig(published),
        source: 'blob-published',
      };
    }
  }
  const seed = getSeedExperience();
  return {
    experience: seed,
    config: buildAppConfig(seed),
    source: 'seed',
  };
}
