import { head, list, put } from '@vercel/blob';
import {
  parseGalleryExperience,
  type GalleryExperience,
} from '@jrichforms/experience';
import { DEFAULT_EXPERIENCE_ID, getSeedExperience } from '@/lib/config';
import { isValidExperienceId, visitorShopPath } from '@/lib/experience-id';

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function draftPath(id = DEFAULT_EXPERIENCE_ID): string {
  return `experiences/${id}/draft/experience.json`;
}

export function publishedPath(id = DEFAULT_EXPERIENCE_ID): string {
  return `experiences/${id}/published/experience.json`;
}

export function assetPathname(
  assetId: string,
  filename: string,
  id = DEFAULT_EXPERIENCE_ID
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `experiences/${id}/assets/${assetId}/${safe}`;
}

async function readJsonBlob(pathname: string): Promise<GalleryExperience | null> {
  if (!isBlobConfigured()) return null;
  try {
    const meta = await head(pathname);
    const res = await fetch(meta.url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return parseGalleryExperience(json);
  } catch {
    return null;
  }
}

export async function getDraft(
  id = DEFAULT_EXPERIENCE_ID
): Promise<GalleryExperience | null> {
  return readJsonBlob(draftPath(id));
}

export async function getPublished(
  id = DEFAULT_EXPERIENCE_ID
): Promise<GalleryExperience | null> {
  return readJsonBlob(publishedPath(id));
}

export async function putDraft(
  experience: GalleryExperience,
  id = DEFAULT_EXPERIENCE_ID
): Promise<GalleryExperience> {
  if (!isBlobConfigured()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  }
  const parsed = parseGalleryExperience(experience);
  if (parsed.id !== id) {
    throw new Error(`experience.id (${parsed.id}) does not match path id (${id})`);
  }
  await put(draftPath(id), JSON.stringify(parsed, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return parsed;
}

export async function publishDraft(
  id = DEFAULT_EXPERIENCE_ID
): Promise<GalleryExperience> {
  const draft = await getDraft(id);
  if (draft === null) throw new Error('No draft to publish');
  const parsed = parseGalleryExperience(draft);
  const nextVersion = bumpPatchVersion(parsed.version);
  const published: GalleryExperience = { ...parsed, version: nextVersion };
  await put(publishedPath(id), JSON.stringify(published, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  await putDraft(published, id);
  return published;
}

export function cloneSeedForId(id: string, title: string): GalleryExperience {
  const seed = getSeedExperience();
  return parseGalleryExperience({
    ...seed,
    id,
    version: '0.1.0',
    gallery: {
      ...seed.gallery,
      title,
      provenance: { ...seed.gallery.provenance, title },
      shop: {
        ...seed.gallery.shop,
        experienceSlug: id,
        shopPath: visitorShopPath(id),
      },
    },
  });
}

export async function createDraftFromSeed(
  id: string,
  title: string
): Promise<GalleryExperience> {
  if (!isBlobConfigured()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  }
  if (!isValidExperienceId(id)) {
    throw new Error('invalid_experience_id');
  }
  if (id === DEFAULT_EXPERIENCE_ID) {
    throw new Error('experience_exists');
  }
  const [draft, published] = await Promise.all([getDraft(id), getPublished(id)]);
  if (draft !== null || published !== null) {
    throw new Error('experience_exists');
  }
  const experience = cloneSeedForId(id, title.trim() || id);
  await putDraft(experience, id);
  return experience;
}

export async function seedDraftIfMissing(
  id = DEFAULT_EXPERIENCE_ID
): Promise<{ experience: GalleryExperience; seeded: boolean }> {
  const existing = await getDraft(id);
  // Avoid `if (existing)` — Turbopack has miscompiled that as always-true after await.
  if (existing !== null) return { experience: existing, seeded: false };

  if (id !== DEFAULT_EXPERIENCE_ID) {
    throw new Error('experience_not_found');
  }

  const seed = getSeedExperience();
  if (!isBlobConfigured()) {
    return { experience: seed, seeded: false };
  }

  await putDraft(seed, id);
  return { experience: seed, seeded: true };
}

export async function blobExists(pathname: string): Promise<boolean> {
  if (!isBlobConfigured()) return false;
  try {
    await head(pathname);
    return true;
  } catch {
    return false;
  }
}

export async function status(id = DEFAULT_EXPERIENCE_ID): Promise<{
  blobConfigured: boolean;
  hasDraft: boolean;
  hasPublished: boolean;
  draftVersion: string | null;
  publishedVersion: string | null;
}> {
  const blobConfigured = isBlobConfigured();
  if (!blobConfigured) {
    const seed = getSeedExperience();
    return {
      blobConfigured: false,
      hasDraft: false,
      hasPublished: false,
      draftVersion: null,
      publishedVersion: id === DEFAULT_EXPERIENCE_ID ? seed.version : null,
    };
  }
  const [draft, published] = await Promise.all([getDraft(id), getPublished(id)]);
  return {
    blobConfigured: true,
    hasDraft: draft !== null,
    hasPublished: published !== null,
    draftVersion: draft?.version ?? null,
    publishedVersion: published?.version ?? null,
  };
}

export type ExperienceIndexItem = {
  id: string;
  title: string;
  blobConfigured: boolean;
  hasDraft: boolean;
  hasPublished: boolean;
  draftVersion: string | null;
  publishedVersion: string | null;
};

async function listBlobExperienceIds(): Promise<string[]> {
  const ids = new Set<string>();
  if (!isBlobConfigured()) return [];
  let cursor: string | undefined;
  do {
    const result = await list({ prefix: 'experiences/', cursor, limit: 1000 });
    for (const blob of result.blobs) {
      const match = /^experiences\/([^/]+)\//.exec(blob.pathname);
      if (match && isValidExperienceId(match[1])) {
        ids.add(match[1]);
      }
    }
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);
  return [...ids];
}

export async function listExperiences(): Promise<{
  blobConfigured: boolean;
  experiences: ExperienceIndexItem[];
}> {
  const blobConfigured = isBlobConfigured();
  const seed = getSeedExperience();
  const ids = new Set<string>([DEFAULT_EXPERIENCE_ID, ...(await listBlobExperienceIds())]);

  const experiences = await Promise.all(
    [...ids].sort().map(async (id) => {
      const [draft, published] = await Promise.all([getDraft(id), getPublished(id)]);
      const pkg =
        draft !== null
          ? draft
          : published !== null
            ? published
            : id === DEFAULT_EXPERIENCE_ID
              ? seed
              : null;
      return {
        id,
        title: pkg?.gallery.provenance.title ?? id,
        blobConfigured,
        hasDraft: draft !== null,
        hasPublished: published !== null,
        draftVersion: draft?.version ?? null,
        publishedVersion:
          published?.version ??
          (id === DEFAULT_EXPERIENCE_ID && !blobConfigured ? seed.version : null),
      };
    })
  );

  return { blobConfigured, experiences };
}

function bumpPatchVersion(version: string): string {
  const parts = version.split('.').map((p) => Number(p));
  if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
    parts[2] += 1;
    return parts.join('.');
  }
  return `${version}.1`;
}

/** Attach a public Blob URL to an asset slot in the draft package. */
export function applyAssetUrl(
  experience: GalleryExperience,
  assetId: string,
  url: string,
  extras?: { interim?: boolean; status?: string }
): GalleryExperience {
  const prev = experience.assets[assetId] ?? {};
  return {
    ...experience,
    assets: {
      ...experience.assets,
      [assetId]: {
        ...prev,
        webPath: url,
        status: extras?.status ?? 'ready',
        ...(extras?.interim !== undefined ? { interim: extras.interim } : {}),
      },
    },
  };
}
