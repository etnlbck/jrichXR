import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import {
  isArtistSession,
  jsonFromNotFound,
  loadArtist,
  type ArtistSession,
} from '@/lib/artist-access';
import { brandAssetPrefix, isValidUserId, patchArtistBrand } from '@/lib/brand-store';
import { parseExperienceId } from '@/lib/experience-id';
import {
  applyAssetUrl,
  assertCanEdit,
  DraftConflictError,
  getDraftWithRevision,
  isBlobConfigured,
  putDraftWithRevision,
  seedDraftIfMissing,
} from '@/lib/experience-store';

const ALLOWED = [
  'model/gltf-binary',
  'model/gltf+json',
  'application/octet-stream',
  'image/png',
  'image/jpeg',
  'image/webp',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
];

const BRAND_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

type BrandUpload = {
  userId: string;
  assetId: 'logo' | 'share';
  /** 'profile' saves the URL into the brand profile; 'none' leaves it to the caller (overrides). */
  apply: 'profile' | 'none';
};

function brandFields(raw: unknown): BrandUpload | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.scope !== 'brand') return null;
  if (r.assetId !== 'logo' && r.assetId !== 'share') return null;
  if (!isValidUserId(r.userId)) return null;
  return { userId: r.userId, assetId: r.assetId, apply: r.apply === 'none' ? 'none' : 'profile' };
}

/** Artists upload into their own brand folder; admins may upload for any artist. */
function parseBrandPayload(
  clientPayload: string | null,
  artist: ArtistSession
): BrandUpload | null {
  if (!clientPayload) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(clientPayload);
  } catch {
    return null;
  }
  if ((raw as { scope?: unknown } | null)?.scope !== 'brand') return null;
  const fields = brandFields(raw);
  if (!fields) throw new Error('Invalid brand upload');
  if (fields.userId !== artist.userId && !artist.isAdmin) throw new Error('not_found');
  return fields;
}

function parseBrandToken(tokenPayload: string | null | undefined): BrandUpload | null {
  if (!tokenPayload) return null;
  try {
    return brandFields(JSON.parse(tokenPayload));
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const artist = await loadArtist();
  if (!isArtistSession(artist)) return artist;
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is required' },
      { status: 503 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const brandUpload = parseBrandPayload(clientPayload, artist);
        if (brandUpload) {
          const prefix = brandAssetPrefix(brandUpload.userId, brandUpload.assetId);
          if (!pathname.startsWith(prefix)) {
            throw new Error(`Invalid upload pathname for brand ${brandUpload.assetId}`);
          }
          return {
            allowedContentTypes: BRAND_IMAGE_TYPES,
            maximumSizeInBytes: 2 * 1024 * 1024,
            addRandomSuffix: true,
            allowOverwrite: false,
            tokenPayload: JSON.stringify({ scope: 'brand', ...brandUpload }),
          };
        }
        let assetId = 'asset';
        let experienceId: string | null = null;
        try {
          if (clientPayload) {
            const parsed = JSON.parse(clientPayload) as {
              assetId?: string;
              experienceId?: string;
            };
            if (parsed.assetId) assetId = parsed.assetId;
            experienceId = parseExperienceId(parsed.experienceId);
          }
        } catch {
          /* ignore */
        }
        if (!experienceId) {
          throw new Error('Invalid experience id');
        }
        await assertCanEdit(experienceId, artist);
        const expectedPrefix = `experiences/${experienceId}/assets/${assetId}/`;
        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error(`Invalid upload pathname for asset ${assetId}`);
        }
        const filename = pathname.split('/').pop() || 'upload.bin';
        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: true,
          tokenPayload: JSON.stringify({ assetId, filename, experienceId }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const brandUpload = parseBrandToken(tokenPayload);
        if (brandUpload) {
          if (brandUpload.apply === 'profile') {
            await patchArtistBrand(brandUpload.userId, {
              [brandUpload.assetId === 'logo' ? 'logoUrl' : 'shareImageUrl']: blob.url,
            });
          }
          return;
        }
        let assetId = 'asset';
        let experienceId: string | null = null;
        try {
          if (tokenPayload) {
            const parsed = JSON.parse(tokenPayload) as {
              assetId?: string;
              experienceId?: string;
            };
            if (parsed.assetId) assetId = parsed.assetId;
            experienceId = parseExperienceId(parsed.experienceId);
          }
        } catch {
          /* ignore */
        }
        if (!experienceId) return;
        try {
          await seedDraftIfMissing(experienceId);
        } catch {
          /* non-default missing drafts skip */
        }
        const clearInterim =
          assetId === 'raw-glb' || assetId === 'narration'
            ? { interim: false }
            : undefined;
        for (let attempt = 0; ; attempt++) {
          const current = await getDraftWithRevision(experienceId);
          if (current === null) return;
          let next = applyAssetUrl(current.experience, assetId, blob.url, {
            status: 'ready',
            ...clearInterim,
          });
          if (assetId === 'marker-display') {
            next = {
              ...next,
              marker: {
                ...next.marker,
                web: {
                  ...next.marker.web,
                  printImage: blob.url,
                },
              },
            };
          }
          const pinImg = /^pin-img-(.+)$/.exec(assetId);
          if (pinImg) {
            const pinId = pinImg[1];
            next = {
              ...next,
              gallery: {
                ...next.gallery,
                pins: (next.gallery.pins ?? []).map((p) =>
                  p.id === pinId ? { ...p, imageUrl: blob.url } : p
                ),
              },
            };
          }
          try {
            await putDraftWithRevision(next, experienceId, current.revision);
            return;
          } catch (err) {
            if (!(err instanceof DraftConflictError) || attempt >= 2) throw err;
          }
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const notFound = jsonFromNotFound(error);
    if (notFound) return notFound;
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
