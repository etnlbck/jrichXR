import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import {
  isArtistSession,
  jsonFromNotFound,
  loadArtist,
} from '@/lib/artist-access';
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
          const next = applyAssetUrl(current.experience, assetId, blob.url, {
            status: 'ready',
            ...clearInterim,
          });
          if (assetId === 'marker-display') {
            next.marker = {
              ...next.marker,
              web: {
                ...next.marker.web,
                printImage: blob.url,
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
