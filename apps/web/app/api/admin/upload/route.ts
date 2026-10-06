import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { parseExperienceId } from '@/lib/experience-id';
import {
  applyAssetUrl,
  getDraft,
  isBlobConfigured,
  putDraft,
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
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
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
        const draft = await getDraft(experienceId);
        if (draft === null) return;
        const clearInterim =
          assetId === 'raw-glb' || assetId === 'narration'
            ? { interim: false }
            : undefined;
        const next = applyAssetUrl(draft, assetId, blob.url, {
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
        await putDraft(next, experienceId);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
