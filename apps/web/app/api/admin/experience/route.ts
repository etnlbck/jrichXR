import { NextResponse } from 'next/server';
import { parseGalleryExperience } from '@jrichforms/experience';
import { requireAdminSession } from '@/lib/admin-auth';
import { DEFAULT_EXPERIENCE_ID } from '@/lib/config';
import { parseExperienceId } from '@/lib/experience-id';
import {
  getDraft,
  isBlobConfigured,
  putDraft,
  seedDraftIfMissing,
  status,
} from '@/lib/experience-store';

function idFromRequest(request: Request): string | null {
  return parseExperienceId(new URL(request.url).searchParams.get('id'));
}

export async function GET(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const id = idFromRequest(request);
  if (!id) {
    return NextResponse.json({ error: 'invalid_experience_id' }, { status: 400 });
  }

  const st = await status(id);

  if (id === DEFAULT_EXPERIENCE_ID && !isBlobConfigured()) {
    const { experience } = await seedDraftIfMissing(id);
    return NextResponse.json({
      experience,
      status: st,
      warning: 'BLOB_READ_WRITE_TOKEN unset — showing seed; saves require Blob',
    });
  }

  try {
    const { experience, seeded } = await seedDraftIfMissing(id);
    return NextResponse.json({ experience, status: st, seeded });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'experience_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is required to save drafts' },
      { status: 503 }
    );
  }

  const id = idFromRequest(request);
  if (!id) {
    return NextResponse.json({ error: 'invalid_experience_id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const experience = parseGalleryExperience(
      (body as { experience?: unknown })?.experience ?? body
    );
    const saved = await putDraft(experience, id);
    const draft = await getDraft(id);
    return NextResponse.json({
      experience: saved,
      status: await status(id),
      draftExists: draft !== null,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'invalid_experience',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 400 }
    );
  }
}
