import { cache } from 'react';
import type { GalleryExperience } from '@jrichforms/experience';
import {
  buildAppConfig,
  DEFAULT_EXPERIENCE_ID,
  getSeedExperience,
  type AppConfig,
} from '@/lib/config';
import { parseExperienceId } from '@/lib/experience-id';
import {
  getPublished,
  getMeta,
  isBlobConfigured,
} from '@/lib/experience-store';

export class ExperienceNotFoundError extends Error {
  constructor(public readonly experienceId: string) {
    super(`experience_not_found:${experienceId}`);
    this.name = 'ExperienceNotFoundError';
  }
}

export type LoadedExperience = {
  experience: GalleryExperience;
  config: AppConfig;
  source: 'blob-published' | 'seed';
};

/**
 * Visitor runtime: published Blob package.
 * Untitled No. 7 falls back to repo seed; other ids do not.
 * Cached per request so metadata, viewport, and the page share one read.
 */
export const loadExperience = cache(loadExperienceUncached);

/** For metadata: null instead of throwing when the experience doesn't exist. */
export async function loadConfigOrNull(raw?: string | null): Promise<AppConfig | null> {
  const id = raw === undefined ? undefined : parseExperienceId(raw);
  if (id === null) return null;
  try {
    // Same arguments as the page's call, so cache() dedupes the read.
    return (id === undefined ? await loadExperience() : await loadExperience(id)).config;
  } catch (err) {
    if (err instanceof ExperienceNotFoundError) return null;
    throw err;
  }
}

async function loadExperienceUncached(
  id = DEFAULT_EXPERIENCE_ID
): Promise<LoadedExperience> {
  if (isBlobConfigured()) {
    const meta = await getMeta(id);
    if (meta.archived === true) {
      throw new ExperienceNotFoundError(id);
    }
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
  if (id !== DEFAULT_EXPERIENCE_ID) {
    throw new ExperienceNotFoundError(id);
  }
  const seed = getSeedExperience();
  return {
    experience: seed,
    config: buildAppConfig(seed),
    source: 'seed',
  };
}
