import { head, put } from '@vercel/blob';
import {
  parseGalleryExperience,
  type GalleryExperience,
} from '@jrichforms/experience';
import { DEFAULT_EXPERIENCE_ID, getSeedExperience } from '@/lib/config';

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
  if (!draft) throw new Error('No draft to publish');
  const parsed = parseGalleryExperience(draft);
  const nextVersion = bumpPatchVersion(parsed.version);
  const published: GalleryExperience = { ...parsed, version: nextVersion };
  await put(publishedPath(id), JSON.stringify(published, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  // Keep draft version in sync after publish
  await putDraft(published, id);
  return published;
}

export async function seedDraftIfMissing(
  id = DEFAULT_EXPERIENCE_ID
): Promise<{ experience: GalleryExperience; seeded: boolean }> {
  // #region agent log
  const _t0 = Date.now();
  fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88764b'},body:JSON.stringify({sessionId:'88764b',runId:'pre-fix',hypothesisId:'F',location:'experience-store:seedDraftIfMissing:entry',message:'seedDraftIfMissing start',data:{id,blobConfigured:isBlobConfigured()},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const existing = await getDraft(id);
  // #region agent log
  fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88764b'},body:JSON.stringify({sessionId:'88764b',runId:'post-fix',hypothesisId:'F',location:'experience-store:seedDraftIfMissing:after-getDraft',message:'getDraft resolved',data:{hasExisting:existing!==null,existingId:existing?.id??null,ms:Date.now()-_t0},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  // Avoid `if (existing)` — Turbopack has miscompiled that as always-true
  // after await, returning a null draft forever (admin stuck on Loading…).
  if (existing !== null) {
    return { experience: existing, seeded: false };
  }

  const seed = getSeedExperience();
  if (!isBlobConfigured()) {
    // #region agent log
    fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88764b'},body:JSON.stringify({sessionId:'88764b',runId:'post-fix',hypothesisId:'F',location:'experience-store:seedDraftIfMissing:seed-no-blob',message:'returning in-memory seed',data:{seedId:seed.id,version:seed.version,ms:Date.now()-_t0},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return { experience: seed, seeded: false };
  }

  await putDraft(seed, id);
  // #region agent log
  fetch('http://127.0.0.1:7885/ingest/58b6237a-cd93-4c95-a29f-59bd9354a96b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88764b'},body:JSON.stringify({sessionId:'88764b',runId:'post-fix',hypothesisId:'F',location:'experience-store:seedDraftIfMissing:seeded',message:'putDraft seed completed',data:{seedId:seed.id,ms:Date.now()-_t0},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
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
      publishedVersion: seed.version,
    };
  }
  const [draft, published] = await Promise.all([getDraft(id), getPublished(id)]);
  return {
    blobConfigured: true,
    hasDraft: !!draft,
    hasPublished: !!published,
    draftVersion: draft?.version ?? null,
    publishedVersion: published?.version ?? null,
  };
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
