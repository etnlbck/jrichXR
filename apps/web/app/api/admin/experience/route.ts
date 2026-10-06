import { NextResponse } from 'next/server';
import { parseGalleryExperience } from '@jrichforms/experience';
import { requireAdminSession } from '@/lib/admin-auth';
import { DEFAULT_EXPERIENCE_ID } from '@/lib/config';
import {
  getDraft,
  isBlobConfigured,
  putDraft,
  seedDraftIfMissing,
  status,
} from '@/lib/experience-store';

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const st = await status(DEFAULT_EXPERIENCE_ID);
  if (!isBlobConfigured()) {
    const { experience } = await seedDraftIfMissing();
    return NextResponse.json({
      experience,
      status: st,
      warning: 'BLOB_READ_WRITE_TOKEN unset — showing seed; saves require Blob',
    });
  }

  const { experience, seeded } = await seedDraftIfMissing();
  return NextResponse.json({ experience, status: st, seeded });
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
    const saved = await putDraft(experience);
    const draft = await getDraft();
    return NextResponse.json({
      experience: saved,
      status: await status(),
      draftExists: !!draft,
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
