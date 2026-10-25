import type { GalleryExperience } from '@jrichforms/experience';
import {
  buildAppConfig,
  DEFAULT_EXPERIENCE_ID,
  getSeedExperience,
  type AppConfig,
} from '@/lib/config';
import {
  getPublished,
  getMeta,
  isBlobConfigured,
} from '@/lib/experience-store';

export type ExperienceNotFoundReason =
  | 'archived'
  | 'unpublished'
  | 'blob_off'
  | 'unknown';

export class ExperienceNotFoundError extends Error {
  constructor(
    public readonly experienceId: string,
    public readonly reason: ExperienceNotFoundReason = 'unknown'
  ) {
    super(`experience_not_found:${experienceId}:${reason}`);
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
 */
export async function loadExperience(
  id = DEFAULT_EXPERIENCE_ID
): Promise<LoadedExperience> {
  const blobOn = isBlobConfigured();
  // #region agent log
  fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '5ef31a',
    },
    body: JSON.stringify({
      sessionId: '5ef31a',
      runId: 'pre-fix',
      hypothesisId: 'A-D',
      location: 'load-experience.ts:entry',
      message: 'loadExperience start',
      data: { id, blobOn },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (blobOn) {
    const meta = await getMeta(id);
    // #region agent log
    fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '5ef31a',
      },
      body: JSON.stringify({
        sessionId: '5ef31a',
        runId: 'pre-fix',
        hypothesisId: 'B',
        location: 'load-experience.ts:meta',
        message: 'meta loaded',
        data: { id, archived: meta.archived === true },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (meta.archived === true) {
      throw new ExperienceNotFoundError(id, 'archived');
    }
    const published = await getPublished(id);
    // Prefer !== null — Turbopack has miscompiled truthy checks after await
    // on GalleryExperience | null (see seedDraftIfMissing).
    // #region agent log
    fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '5ef31a',
      },
      body: JSON.stringify({
        sessionId: '5ef31a',
        runId: 'pre-fix',
        hypothesisId: 'A-E',
        location: 'load-experience.ts:published',
        message: 'published lookup',
        data: {
          id,
          hasPublished: published !== null,
          publishedId: published?.id ?? null,
          publishedVersion: published?.version ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (published !== null) {
      return {
        experience: published,
        config: buildAppConfig(published),
        source: 'blob-published',
      };
    }
  }
  if (id !== DEFAULT_EXPERIENCE_ID) {
    const reason = blobOn ? 'unpublished' : 'blob_off';
    // #region agent log
    fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '5ef31a',
      },
      body: JSON.stringify({
        sessionId: '5ef31a',
        runId: 'pre-fix',
        hypothesisId: 'A-D',
        location: 'load-experience.ts:not-found',
        message: 'throwing ExperienceNotFoundError',
        data: { id, reason, blobOn },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw new ExperienceNotFoundError(id, reason);
  }
  const seed = getSeedExperience();
  return {
    experience: seed,
    config: buildAppConfig(seed),
    source: 'seed',
  };
}
