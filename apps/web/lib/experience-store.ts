import {
  BlobNotFoundError,
  BlobPreconditionFailedError,
  del,
  get,
  head,
  list,
  put,
} from '@vercel/blob';
import {
  brandHash,
  mergeBrand,
  parseGalleryExperience,
  type ArtistBrand,
  type GalleryExperience,
} from '@jrichforms/experience';
import { getArtistBrand } from '@/lib/brand-store';
import { DEFAULT_EXPERIENCE_ID, getSeedExperience } from '@/lib/config';
import { isValidExperienceId, visitorShopPath } from '@/lib/experience-id';

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export function draftPath(id = DEFAULT_EXPERIENCE_ID): string {
  return `experiences/${id}/draft/experience.json`;
}

export function publishedPath(id = DEFAULT_EXPERIENCE_ID): string {
  return `experiences/${id}/published/experience.json`;
}

export function metaPath(id = DEFAULT_EXPERIENCE_ID): string {
  return `experiences/${id}/meta.json`;
}

export function accessPath(id = DEFAULT_EXPERIENCE_ID): string {
  return `experiences/${id}/access.json`;
}

export type ExperienceMeta = {
  archived: boolean;
  archivedAt: string | null;
};

export type ExperienceAccess = {
  ownerUserId: string;
  createdAt: string;
};

export type ExperienceEditor = {
  userId: string;
  isAdmin: boolean;
};

const EMPTY_META: ExperienceMeta = { archived: false, archivedAt: null };

function assertMutableExperience(id: string): void {
  if (id === DEFAULT_EXPERIENCE_ID) {
    throw new Error('cannot_modify_default');
  }
}

export function assetPathname(
  assetId: string,
  filename: string,
  id = DEFAULT_EXPERIENCE_ID
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `experiences/${id}/assets/${assetId}/${safe}`;
}

type TimedExperience = { experience: GalleryExperience; uploadedAt: string };

async function readJsonBlob(pathname: string): Promise<TimedExperience | null> {
  if (!isBlobConfigured()) return null;
  try {
    const meta = await head(pathname);
    const res = await fetch(meta.url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      experience: parseGalleryExperience(json),
      uploadedAt: new Date(meta.uploadedAt).toISOString(),
    };
  } catch {
    return null;
  }
}

/** Draft was written by someone else since the caller loaded it. */
export class DraftConflictError extends Error {
  constructor() {
    super('draft_conflict');
    this.name = 'DraftConflictError';
  }
}

export type RevisionedDraft = {
  experience: GalleryExperience;
  /** Blob ETag of the draft; send it back as baseRevision when saving. */
  revision: string;
};

/**
 * Drafts are overwritten in place, so read from origin rather than the CDN;
 * a cached copy would make read-modify-write saves silently drop edits.
 */
export async function getDraftWithRevision(
  id = DEFAULT_EXPERIENCE_ID
): Promise<RevisionedDraft | null> {
  if (!isBlobConfigured()) return null;
  try {
    const res = await get(draftPath(id), { access: 'public', useCache: false });
    if (res === null || res.statusCode !== 200) return null;
    const json = await new Response(res.stream).json();
    // The CDN can serve a weak ETag (W/"..."); Blob's ifMatch only accepts
    // the strong form, so every save would 409 without normalizing here.
    return {
      experience: parseGalleryExperience(json),
      revision: res.blob.etag.replace(/^W\//, ''),
    };
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
  }
}

export async function getDraft(
  id = DEFAULT_EXPERIENCE_ID
): Promise<GalleryExperience | null> {
  const draft = await getDraftWithRevision(id);
  return draft === null ? null : draft.experience;
}

/**
 * Write the draft. With `ifRevision`, the write only succeeds when the stored
 * draft still has that ETag; otherwise DraftConflictError is thrown.
 */
export async function putDraftWithRevision(
  experience: GalleryExperience,
  id = DEFAULT_EXPERIENCE_ID,
  ifRevision?: string
): Promise<RevisionedDraft> {
  if (!isBlobConfigured()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  }
  const parsed = parseGalleryExperience(experience);
  if (parsed.id !== id) {
    throw new Error(`experience.id (${parsed.id}) does not match path id (${id})`);
  }
  try {
    const result = await put(draftPath(id), JSON.stringify(parsed, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      ...(ifRevision ? { ifMatch: ifRevision } : {}),
    });
    return { experience: parsed, revision: result.etag };
  } catch (err) {
    if (err instanceof BlobPreconditionFailedError) throw new DraftConflictError();
    throw err;
  }
}

export async function getPublished(
  id = DEFAULT_EXPERIENCE_ID
): Promise<GalleryExperience | null> {
  return (await readJsonBlob(publishedPath(id)))?.experience ?? null;
}

/** The published package plus when it was last published (the blob is overwritten on publish). */
async function getPublishedWithTime(id: string): Promise<TimedExperience | null> {
  return readJsonBlob(publishedPath(id));
}

export async function putDraft(
  experience: GalleryExperience,
  id = DEFAULT_EXPERIENCE_ID
): Promise<GalleryExperience> {
  return (await putDraftWithRevision(experience, id)).experience;
}

export async function publishDraft(
  id = DEFAULT_EXPERIENCE_ID,
  ifRevision?: string
): Promise<RevisionedDraft> {
  const current = await getDraftWithRevision(id);
  if (current === null) throw new Error('No draft to publish');
  if (ifRevision && current.revision !== ifRevision) throw new DraftConflictError();
  const parsed = parseGalleryExperience(current.experience);
  delete parsed.brand;
  const nextVersion = bumpPatchVersion(parsed.version);
  const access = await getExperienceAccess(id);
  const profile = access ? await getArtistBrand(access.ownerUserId) : {};
  const brand = mergeBrand(profile, parsed.gallery.brandOverrides);
  const draft: GalleryExperience = { ...parsed, version: nextVersion };
  const published: GalleryExperience = {
    ...draft,
    ...(Object.keys(brand).length > 0 ? { brand } : {}),
  };
  await put(publishedPath(id), JSON.stringify(published, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return putDraftWithRevision(draft, id, current.revision);
}

/** Brand that publishing `pkg` now would freeze: owner profile plus its overrides. */
export function pendingBrand(
  pkg: GalleryExperience | null,
  ownerProfile: ArtistBrand
): ArtistBrand {
  return mergeBrand(ownerProfile, pkg?.gallery.brandOverrides);
}

/**
 * Re-snapshot the owner's current profile into the published package only.
 * Unpublished draft edits stay unpublished.
 */
export async function republishBrand(id: string): Promise<'updated' | 'unchanged'> {
  const published = await getPublished(id);
  if (published === null) throw new Error('not_published');
  const access = await getExperienceAccess(id);
  const profile = access ? await getArtistBrand(access.ownerUserId) : {};
  const brand = pendingBrand(published, profile);
  if (brandHash(brand) === brandHash(published.brand)) return 'unchanged';
  const next: GalleryExperience = { ...published };
  delete next.brand;
  if (Object.keys(brand).length > 0) next.brand = brand;
  await put(publishedPath(id), JSON.stringify(next, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return 'updated';
}

export function cloneSeedForId(
  id: string,
  title: string,
  kind: GalleryExperience['kind'] = 'mural'
): GalleryExperience {
  const seed = getSeedExperience();
  const base = {
    ...seed,
    id,
    kind,
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
  };
  if (kind === 'experience') {
    // Finished-focused: drop raw morph node; clear sculpture-only copy.
    base.nodes = seed.nodes.filter((n) => n.id !== 'raw');
    base.gallery = {
      ...base.gallery,
      provenance: {
        title,
        material: '',
        dimensions: '',
        year: '',
        exhibition: '',
      },
      shop: {
        experienceSlug: id,
        shopPath: '',
        acquireUrl: '',
      },
      usePlaceholderCube: false,
    };
  }
  return parseGalleryExperience(base);
}

export async function createDraftFromSeed(
  id: string,
  title: string,
  ownerUserId: string,
  options: { kind?: GalleryExperience['kind'] } = {}
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
  const meta = await getMeta(id);
  if (meta.archived === true) {
    throw new Error('experience_archived');
  }
  const [draft, published] = await Promise.all([getDraft(id), getPublished(id)]);
  if (draft !== null || published !== null) {
    throw new Error('experience_exists');
  }
  const kind = options.kind === 'experience' ? 'experience' : 'mural';
  const experience = cloneSeedForId(id, title.trim() || id, kind);
  await putDraft(experience, id);
  await putExperienceAccess(id, {
    ownerUserId,
    createdAt: new Date().toISOString(),
  });
  return experience;
}

export async function seedDraftIfMissing(
  id = DEFAULT_EXPERIENCE_ID
): Promise<{
  experience: GalleryExperience;
  seeded: boolean;
  /** Null when Blob is not configured (in-memory seed). */
  revision: string | null;
}> {
  const existing = await getDraftWithRevision(id);
  // Avoid `if (existing)` — Turbopack has miscompiled that as always-true after await.
  if (existing !== null) return { ...existing, seeded: false };

  if (id !== DEFAULT_EXPERIENCE_ID) {
    throw new Error('experience_not_found');
  }

  const seed = getSeedExperience();
  if (!isBlobConfigured()) {
    return { experience: seed, seeded: false, revision: null };
  }

  const written = await putDraftWithRevision(seed, id);
  return { ...written, seeded: true };
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

export async function getMeta(
  id = DEFAULT_EXPERIENCE_ID
): Promise<ExperienceMeta> {
  if (!isBlobConfigured()) return EMPTY_META;
  try {
    const file = await head(metaPath(id));
    const res = await fetch(file.url, { cache: 'no-store' });
    if (!res.ok) return EMPTY_META;
    const json = (await res.json()) as Partial<ExperienceMeta>;
    return {
      archived: json.archived === true,
      archivedAt: typeof json.archivedAt === 'string' ? json.archivedAt : null,
    };
  } catch {
    return EMPTY_META;
  }
}

export async function getExperienceAccess(
  id: string
): Promise<ExperienceAccess | null> {
  if (!isBlobConfigured()) return null;
  try {
    const file = await head(accessPath(id));
    const res = await fetch(file.url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<ExperienceAccess>;
    if (typeof json.ownerUserId !== 'string' || !json.ownerUserId) return null;
    return {
      ownerUserId: json.ownerUserId,
      createdAt:
        typeof json.createdAt === 'string'
          ? json.createdAt
          : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

async function putExperienceAccess(
  id: string,
  access: ExperienceAccess
): Promise<ExperienceAccess> {
  if (!isBlobConfigured()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  }
  await put(accessPath(id), JSON.stringify(access, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return access;
}

export async function setExperienceOwner(
  id: string,
  ownerUserId: string
): Promise<ExperienceAccess> {
  assertMutableExperience(id);
  const current = await getExperienceAccess(id);
  return putExperienceAccess(id, {
    ownerUserId,
    createdAt: current?.createdAt ?? new Date().toISOString(),
  });
}

export async function canEditExperience(
  id: string,
  editor: ExperienceEditor
): Promise<boolean> {
  if (editor.isAdmin) return true;
  const access = await getExperienceAccess(id);
  return access?.ownerUserId === editor.userId;
}

export async function assertCanEdit(
  id: string,
  editor: ExperienceEditor
): Promise<void> {
  if (!(await canEditExperience(id, editor))) {
    throw new Error('not_found');
  }
}

async function putMeta(id: string, meta: ExperienceMeta): Promise<ExperienceMeta> {
  if (!isBlobConfigured()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  }
  await put(metaPath(id), JSON.stringify(meta, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return meta;
}

export async function archiveExperience(id: string): Promise<ExperienceMeta> {
  assertMutableExperience(id);
  return putMeta(id, {
    archived: true,
    archivedAt: new Date().toISOString(),
  });
}

export async function restoreExperience(id: string): Promise<ExperienceMeta> {
  assertMutableExperience(id);
  return putMeta(id, { archived: false, archivedAt: null });
}

export async function deleteExperience(id: string): Promise<void> {
  assertMutableExperience(id);
  if (!isBlobConfigured()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  }
  const meta = await getMeta(id);
  if (meta.archived !== true) {
    throw new Error('not_archived');
  }
  const urls: string[] = [];
  let cursor: string | undefined;
  do {
    const result = await list({
      prefix: `experiences/${id}/`,
      cursor,
      limit: 1000,
    });
    for (const blob of result.blobs) {
      urls.push(blob.url);
    }
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);
  if (urls.length > 0) {
    await del(urls);
  }
}

export async function status(id = DEFAULT_EXPERIENCE_ID): Promise<{
  blobConfigured: boolean;
  hasDraft: boolean;
  hasPublished: boolean;
  draftVersion: string | null;
  publishedVersion: string | null;
  publishedAt: string | null;
  archived: boolean;
  archivedAt: string | null;
}> {
  const blobConfigured = isBlobConfigured();
  const meta = await getMeta(id);
  if (!blobConfigured) {
    const seed = getSeedExperience();
    return {
      blobConfigured: false,
      hasDraft: false,
      hasPublished: false,
      draftVersion: null,
      publishedVersion: id === DEFAULT_EXPERIENCE_ID ? seed.version : null,
      publishedAt: null,
      archived: false,
      archivedAt: null,
    };
  }
  const [draft, published] = await Promise.all([getDraft(id), getPublishedWithTime(id)]);
  return {
    blobConfigured: true,
    hasDraft: draft !== null,
    hasPublished: published !== null,
    draftVersion: draft?.version ?? null,
    publishedVersion: published?.experience.version ?? null,
    publishedAt: published?.uploadedAt ?? null,
    archived: meta.archived === true,
    archivedAt: meta.archivedAt,
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
  publishedAt: string | null;
  archived: boolean;
  archivedAt: string | null;
  ownerUserId: string | null;
  /** Published, and republishing would change its brand. */
  brandChanged: boolean;
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

export async function listExperiences(editor: ExperienceEditor): Promise<{
  blobConfigured: boolean;
  experiences: ExperienceIndexItem[];
}> {
  const blobConfigured = isBlobConfigured();
  const seed = getSeedExperience();
  const ids = new Set<string>([DEFAULT_EXPERIENCE_ID, ...(await listBlobExperienceIds())]);
  const profiles = new Map<string, Promise<ArtistBrand>>();
  const profileFor = (userId: string) => {
    let p = profiles.get(userId);
    if (!p) {
      p = getArtistBrand(userId).catch(() => ({}));
      profiles.set(userId, p);
    }
    return p;
  };

  const experiences = (
    await Promise.all(
      [...ids].sort().map(async (id) => {
        const [draft, published, meta, access] = await Promise.all([
          getDraft(id),
          getPublishedWithTime(id),
          getMeta(id),
          getExperienceAccess(id),
        ]);
        if (!editor.isAdmin && access?.ownerUserId !== editor.userId) {
          return null;
        }
        const pkg =
          draft !== null
            ? draft
            : published !== null
              ? published.experience
              : id === DEFAULT_EXPERIENCE_ID
                ? seed
                : null;
        const brandChanged =
          published !== null && access !== null
            ? brandHash(
                pendingBrand(published.experience, await profileFor(access.ownerUserId))
              ) !== brandHash(published.experience.brand)
            : false;
        return {
          id,
          title: pkg?.gallery.provenance.title ?? id,
          blobConfigured,
          hasDraft: draft !== null,
          hasPublished: published !== null,
          draftVersion: draft?.version ?? null,
          publishedVersion:
            published?.experience.version ??
            (id === DEFAULT_EXPERIENCE_ID && !blobConfigured ? seed.version : null),
          publishedAt: published?.uploadedAt ?? null,
          archived: meta.archived === true,
          archivedAt: meta.archivedAt,
          ownerUserId: access?.ownerUserId ?? null,
          brandChanged,
        };
      })
    )
  ).filter((item): item is ExperienceIndexItem => item !== null);

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
